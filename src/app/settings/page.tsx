'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { DEFAULT_SENSITIVE_WORDS, sanitizeText, findSensitiveWords } from '@/lib/utils/sensitive-words';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { SocialPage } from '@/types';
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Building2,
  Sliders,
  CheckCircle2,
  Save,
  Bell,
  ShieldCheck,
  KeyRound,
  Radio,
  Clock,
  RotateCw,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  Play,
  Terminal,
  ExternalLink,
  RefreshCw,
  X,
  Info,
  Plus,
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}

function SettingsContent() {
  const {
    user,
    workspace,
    settings,
    updateSettings,
    updateUser,
    updateWorkspace,
    isHydrated,
    accounts,
    pages,
    addAccount,
    addPages,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'facebook' | 'youtube' | 'retry' | 'words' | 'cron' | 'profile'>('facebook');

  // Facebook App
  const [fbAppId, setFbAppId] = useState(settings?.metaAppId || '');
  const [fbAppSecret, setFbAppSecret] = useState(settings?.metaAppSecret || '');
  const [showFbSecret, setShowFbSecret] = useState(false);

  // Direct Token Connect Modal (Settings)
  const [showTokenConnectModal, setShowTokenConnectModal] = useState(false);
  const [directToken, setDirectToken] = useState('');
  const [directPageId, setDirectPageId] = useState('');
  const [isConnectingToken, setIsConnectingToken] = useState(false);
  const [tokenConnectError, setTokenConnectError] = useState<string | null>(null);
  const [tokenConnectSuccess, setTokenConnectSuccess] = useState<string | null>(null);

  // YouTube
  const [ytClientId, setYtClientId] = useState(settings?.ytClientId || '');
  const [ytClientSecret, setYtClientSecret] = useState(settings?.ytClientSecret || '');
  const [ytApiKey, setYtApiKey] = useState(settings?.ytApiKey || '');
  const [showYtSecret, setShowYtSecret] = useState(false);
  const [ytAutoShort, setYtAutoShort] = useState(settings?.ytAutoShort ?? true);
  const [ytDescriptionTemplate, setYtDescriptionTemplate] = useState(
    settings?.ytDescriptionTemplate ||
      "{title}\n\n👉 ताज़ा और महत्वपूर्ण खबरों के लिए चैनल सब्सक्राइब करें!\n#Shorts #News #Viral"
  );
  const [alertEmail, setAlertEmail] = useState(settings?.alertEmail || user?.email || '');

  // Direct YouTube Connect Modal (Settings)
  const [showYtConnectModal, setShowYtConnectModal] = useState(false);
  const [directYtInput, setDirectYtInput] = useState('');
  const [directYtApiKey, setDirectYtApiKey] = useState('');
  const [isConnectingYt, setIsConnectingYt] = useState(false);
  const [ytConnectError, setYtConnectError] = useState<string | null>(null);
  const [ytConnectSuccess, setYtConnectSuccess] = useState<string | null>(null);

  // Auto-Retry
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(settings?.autoRetryEnabled ?? true);
  const [autoRetryMax, setAutoRetryMax] = useState(settings?.autoRetryMax ?? 3);
  const [autoRetryIntervalMin, setAutoRetryIntervalMin] = useState(settings?.autoRetryIntervalMin ?? 15);

  // Sensitive Words
  const [sensitiveWordsRaw, setSensitiveWordsRaw] = useState(
    (settings?.sensitiveWords && settings.sensitiveWords.length > 0
      ? settings.sensitiveWords
      : DEFAULT_SENSITIVE_WORDS
    ).join(', ')
  );
  const [testHeadline, setTestHeadline] = useState('हिमाचल में दर्दनाक सड़क हादसा, 3 की मौत, 5 घायल');
  const [testResult, setTestResult] = useState('');

  // Cron
  const [cronSecret, setCronSecret] = useState(settings?.cronSecretKey || 'sap_live_secret_k8f93a7d2b0e');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Profile & Workspace
  const [userName, setUserName] = useState(user?.name || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || '');

  // Save notice
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://soical.vercel.app';

  // Sync inputs when settings hydrate from localStorage
  useEffect(() => {
    if (isHydrated && settings) {
      if (settings.metaAppId !== undefined) setFbAppId(settings.metaAppId);
      if (settings.metaAppSecret !== undefined) setFbAppSecret(settings.metaAppSecret);
      if (settings.ytClientId !== undefined) setYtClientId(settings.ytClientId);
      if (settings.ytClientSecret !== undefined) setYtClientSecret(settings.ytClientSecret);
      if (settings.ytApiKey !== undefined) setYtApiKey(settings.ytApiKey);
      if (settings.ytAutoShort !== undefined) setYtAutoShort(settings.ytAutoShort);
      if (settings.ytDescriptionTemplate !== undefined) setYtDescriptionTemplate(settings.ytDescriptionTemplate);
      if (settings.alertEmail !== undefined) setAlertEmail(settings.alertEmail);
      if (settings.autoRetryEnabled !== undefined) setAutoRetryEnabled(settings.autoRetryEnabled);
      if (settings.autoRetryMax !== undefined) setAutoRetryMax(settings.autoRetryMax);
      if (settings.autoRetryIntervalMin !== undefined) setAutoRetryIntervalMin(settings.autoRetryIntervalMin);
      if (settings.sensitiveWords && settings.sensitiveWords.length > 0) {
        setSensitiveWordsRaw(settings.sensitiveWords.join(', '));
      }
      if (settings.cronSecretKey !== undefined) setCronSecret(settings.cronSecretKey);
    }
  }, [isHydrated, settings]);

  useEffect(() => {
    if (isHydrated && user) {
      if (user.name) setUserName(user.name);
      if (user.email) setUserEmail(user.email);
    }
  }, [isHydrated, user]);

  useEffect(() => {
    if (isHydrated && workspace) {
      if (workspace.name) setWorkspaceName(workspace.name);
    }
  }, [isHydrated, workspace]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleTestSanitize = () => {
    const customList = sensitiveWordsRaw
      .split(/[,;\n]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    const sanitized = sanitizeText(testHeadline, customList);
    const found = findSensitiveWords(testHeadline, customList);
    setTestResult(
      `Detected: [${found.join(', ')}] → Sanitized Headline: "${sanitized}" (Zero-width characters inserted to bypass Facebook flags)`
    );
  };

  const handleConnectDirectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directToken.trim()) return;
    setIsConnectingToken(true);
    setTokenConnectError(null);
    setTokenConnectSuccess(null);

    try {
      const res = await fetch('/api/connect/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: directToken.trim(),
          pageId: directPageId.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setTokenConnectError(data.error || 'Failed to verify Facebook token.');
        setIsConnectingToken(false);
        return;
      }

      const verifiedPages = data.pages || [];
      if (verifiedPages.length === 0) {
        setTokenConnectError('No Facebook Pages were returned for this access token.');
        setIsConnectingToken(false);
        return;
      }

      // Create Parent Account
      const primaryPage = verifiedPages[0];
      const newAcc = addAccount('facebook', `${primaryPage.name} (Meta Account)`, {
        accessToken: directToken.trim(),
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
        accessToken: p.accessToken || directToken.trim(),
        targetUrl: `https://facebook.com/${p.id}`,
        category: 'Facebook Page',
        permissions: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
      }));

      addPages(pagesToAdd);

      setTokenConnectSuccess(`Successfully imported ${verifiedPages.length} Facebook Page(s) live!`);
      setDirectToken('');
      setDirectPageId('');
      setTimeout(() => {
        setShowTokenConnectModal(false);
        setTokenConnectSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setTokenConnectError(err instanceof Error ? err.message : 'Network error verifying Meta API.');
    } finally {
      setIsConnectingToken(false);
    }
  };

  const handleConnectDirectYouTube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directYtInput.trim()) return;
    setIsConnectingYt(true);
    setYtConnectError(null);
    setYtConnectSuccess(null);

    try {
      const res = await fetch('/api/connect/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelHandleOrId: directYtInput.trim(),
          apiKey: directYtApiKey.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!data.success || !data.channel) {
        setYtConnectError(data.error || 'Failed to verify YouTube channel.');
        setIsConnectingYt(false);
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
      setYtConnectSuccess(`Successfully connected ${ch.name} live!`);
      setDirectYtInput('');
      setDirectYtApiKey('');
      setTimeout(() => {
        setShowYtConnectModal(false);
        setYtConnectSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setYtConnectError(err instanceof Error ? err.message : 'Network error contacting YouTube API.');
    } finally {
      setIsConnectingYt(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const wordsArray = sensitiveWordsRaw
      .split(/[,;\n]+/)
      .map((w) => w.trim())
      .filter(Boolean);

    // 1. Save settings to state and persistent storage
    updateSettings({
      metaAppId: fbAppId.trim(),
      metaAppSecret: fbAppSecret.trim(),
      ytClientId: ytClientId.trim(),
      ytClientSecret: ytClientSecret.trim(),
      ytApiKey: ytApiKey.trim(),
      ytAutoShort,
      ytDescriptionTemplate,
      alertEmail: alertEmail.trim(),
      autoRetryEnabled,
      autoRetryMax: Number(autoRetryMax) || 3,
      autoRetryIntervalMin: Number(autoRetryIntervalMin) || 15,
      sensitiveWords: wordsArray.length > 0 ? wordsArray : DEFAULT_SENSITIVE_WORDS,
      cronSecretKey: cronSecret.trim(),
    });

    // 2. Update user profile and workspace
    updateUser({ name: userName.trim(), email: userEmail.trim() });
    updateWorkspace({ name: workspaceName.trim() });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 font-sans max-w-5xl animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Platform Settings & Anti-Ban Controls
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Configure Facebook own app credentials, YouTube Google API, anti-ban dictionary, and auto-retry engine.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 animate-fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs overflow-x-auto">
        {[
          { id: 'facebook', label: '📘 Facebook App' },
          { id: 'youtube', label: '▶️ YouTube & Video' },
          { id: 'retry', label: '🔁 Auto-Retry' },
          { id: 'words', label: '🛡️ Word Filter' },
          { id: 'cron', label: '⚡ Cron & Queue' },
          { id: 'profile', label: '👤 Profile & Team' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#F8F9FA]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: FACEBOOK APP */}
        {activeTab === 'facebook' && (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
              <span className="text-xl">📘</span>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Own Facebook App Settings
                </h3>
                <p className="text-[11px] text-slate-400">
                  Connect via your own Meta Developers App. This ensures your posts carry your verified business branding.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Facebook App ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fbAppId}
                  onChange={(e) => setFbAppId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 transition-colors"
                  placeholder="e.g. 109283746501928"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Facebook App Secret <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showFbSecret ? 'text' : 'password'}
                    required
                    value={fbAppSecret}
                    onChange={(e) => setFbAppSecret(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 transition-colors pr-14"
                    placeholder="Enter Meta App Secret"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFbSecret(!showFbSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors"
                  >
                    {showFbSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Valid OAuth Redirect URI
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${currentOrigin}/api/auth/callback/facebook`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] text-xs font-mono text-slate-700 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${currentOrigin}/api/auth/callback/facebook`,
                      'fb_uri'
                    )
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 hover:bg-black transition-colors shadow-2xs"
                >
                  {copiedField === 'fb_uri' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedField === 'fb_uri' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Paste this into developers.facebook.com → Facebook Login → Settings → Valid OAuth Redirect URIs.
              </p>
            </div>

            {/* Live Facebook Account Connection Card */}
            <div className="pt-5 border-t border-[#E2E8F0] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Connect & Authorize Facebook Account
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Choose OAuth Login to authenticate via your Meta Developer App, or paste a Page Token directly.
                  </p>
                </div>

                {pages.filter((p) => p.platform === 'facebook').length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{pages.filter((p) => p.platform === 'facebook').length} Page(s) Connected</span>
                  </span>
                )}
              </div>

              {/* Already Connected Pages summary */}
              {pages.filter((p) => p.platform === 'facebook').length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Active Facebook Pages in Workspace:
                    </span>
                    <Link
                      href="/pages"
                      className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1"
                    >
                      <span>Manage All Pages</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {pages
                      .filter((p) => p.platform === 'facebook')
                      .map((pg) => (
                        <div
                          key={pg.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-slate-800 shadow-2xs"
                        >
                          <SocialIcon platform="facebook" className="w-4 h-4 rounded-xs" />
                          <span>{pg.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({pg.pageId})</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: Official Facebook OAuth Login */}
                <a
                  href={`/api/auth/facebook?app_id=${encodeURIComponent(
                    fbAppId.trim() || '109283746501928'
                  )}&app_secret=${encodeURIComponent(fbAppSecret.trim())}`}
                  className="p-3.5 rounded-2xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold flex items-center justify-center gap-2.5 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <SocialIcon platform="facebook" className="w-4 h-4 rounded-xs" />
                  <span>Log in with Facebook (OAuth)</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                {/* Option 2: Direct Page Token Connect Button */}
                <button
                  type="button"
                  onClick={() => {
                    setTokenConnectError(null);
                    setTokenConnectSuccess(null);
                    setShowTokenConnectModal(true);
                  }}
                  className="p-3.5 rounded-2xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs hover:scale-[1.01]"
                >
                  <KeyRound className="w-4 h-4 text-slate-600" />
                  <span>Connect with Page Token (Instant)</span>
                </button>
              </div>

              {/* Developer Helper Info */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-[11px] text-blue-900 space-y-1.5 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <Info className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>How to connect your Facebook account:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-blue-800">
                  <li>
                    <strong>Method 1 (OAuth)</strong>: Click &quot;Log in with Facebook (OAuth)&quot; above. Ensure <code>{currentOrigin}/api/auth/callback/facebook</code> is saved in your Meta Developer App &rarr; Facebook Login &rarr; Settings &rarr; Valid OAuth Redirect URIs.
                  </li>
                  <li>
                    <strong>Method 2 (Instant Page Token)</strong>: If your Meta App is in Development mode, you can instantly connect by generating a Page Token from{' '}
                    <a
                      href="https://developers.facebook.com/tools/explorer/"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-bold hover:text-blue-950 inline-flex items-center gap-0.5"
                    >
                      Meta Graph API Explorer <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    and pasting it via &quot;Connect with Page Token&quot;.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: YOUTUBE & VIDEO */}
        {activeTab === 'youtube' && (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
              <span className="text-xl">▶️</span>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  YouTube Data API v3 & Shorts Settings
                </h3>
                <p className="text-[11px] text-slate-400">
                  Configure Google Cloud API keys for publishing Hindi news video summaries as YouTube Shorts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Google OAuth Client ID
                </label>
                <input
                  type="text"
                  value={ytClientId}
                  onChange={(e) => setYtClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500"
                  placeholder="e.g. 1092837465019-abc123xyz789.apps.googleusercontent.com"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Google OAuth Client Secret
                </label>
                <div className="relative">
                  <input
                    type={showYtSecret ? 'text' : 'password'}
                    value={ytClientSecret}
                    onChange={(e) => setYtClientSecret(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 pr-14"
                    placeholder="GOCSPX-••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowYtSecret(!showYtSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors"
                  >
                    {showYtSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                YouTube Data API v3 Key <span className="text-slate-400 font-normal">(Optional — for quick handle lookup)</span>
              </label>
              <input
                type="password"
                value={ytApiKey}
                onChange={(e) => setYtApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500"
                placeholder="AIzaSy... (Generated from Google Cloud Console → Credentials → API Keys)"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Valid OAuth Redirect URI
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${currentOrigin}/api/auth/callback/youtube`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] text-xs font-mono text-slate-700 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${currentOrigin}/api/auth/callback/youtube`,
                      'yt_uri'
                    )
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 hover:bg-black transition-colors shadow-2xs"
                >
                  {copiedField === 'yt_uri' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedField === 'yt_uri' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Paste this into console.cloud.google.com → APIs & Services → Credentials → Authorized redirect URIs.
              </p>
            </div>

            {/* Live YouTube Account Connection Card */}
            <div className="pt-5 border-t border-[#E2E8F0] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Connect & Authorize YouTube Channel
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Connect your YouTube channel for publishing Shorts, community posts, and video updates.
                  </p>
                </div>

                {pages.filter((p) => p.platform === 'youtube').length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{pages.filter((p) => p.platform === 'youtube').length} Channel(s) Connected</span>
                  </span>
                )}
              </div>

              {/* Already Connected Channels summary */}
              {pages.filter((p) => p.platform === 'youtube').length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Active YouTube Channels in Workspace:
                    </span>
                    <Link
                      href="/pages"
                      className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1"
                    >
                      <span>Manage Channels</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {pages
                      .filter((p) => p.platform === 'youtube')
                      .map((pg) => (
                        <div
                          key={pg.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-slate-800 shadow-2xs"
                        >
                          <SocialIcon platform="youtube" className="w-4 h-4 rounded-xs" />
                          <span>{pg.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({pg.pageId})</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: Official Google OAuth Login */}
                <a
                  href={`/api/auth/youtube?client_id=${encodeURIComponent(
                    ytClientId.trim() || ''
                  )}&client_secret=${encodeURIComponent(ytClientSecret.trim())}`}
                  className="p-3.5 rounded-2xl bg-[#FF0000] hover:bg-[#CC0000] text-white text-xs font-bold flex items-center justify-center gap-2.5 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <SocialIcon platform="youtube" className="w-4 h-4 rounded-xs" />
                  <span>Log in with YouTube (OAuth)</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                {/* Option 2: Direct Channel Connect Button */}
                <button
                  type="button"
                  onClick={() => {
                    setYtConnectError(null);
                    setYtConnectSuccess(null);
                    setShowYtConnectModal(true);
                  }}
                  className="p-3.5 rounded-2xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs hover:scale-[1.01]"
                >
                  <KeyRound className="w-4 h-4 text-slate-600" />
                  <span>Connect Channel (Handle / ID)</span>
                </button>
              </div>

              {/* Developer Helper Info */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/80 text-[11px] text-rose-950 space-y-1.5 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-rose-950">
                  <Info className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>How to connect your YouTube Channel:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-rose-900">
                  <li>
                    <strong>Method 1 (Google OAuth)</strong>: In <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline font-bold inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-2.5 h-2.5" /></a>, enable <strong>YouTube Data API v3</strong>, create OAuth 2.0 Web Client credentials, paste <code>{currentOrigin}/api/auth/callback/youtube</code> into Authorized redirect URIs, and click &quot;Log in with YouTube&quot;.
                  </li>
                  <li>
                    <strong>Method 2 (Direct Channel)</strong>: Simply enter your YouTube Channel Handle (e.g. <code>@khabarmonkey</code>) or Channel ID (e.g. <code>UC...</code>) via &quot;Connect Channel (Handle / ID)&quot;.
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ytAutoShort}
                  onChange={(e) => setYtAutoShort(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Auto-Post to YouTube Shorts
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    When publishing a short video or reel to Facebook, automatically upload as YouTube Short.
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                YouTube Description Template
              </label>
              <textarea
                rows={4}
                value={ytDescriptionTemplate}
                onChange={(e) => setYtDescriptionTemplate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 font-sans"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Use <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold">&#123;title&#125;</code> to dynamically insert the post headline.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Account Error & Disconnect Alert Email
              </label>
              <input
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                placeholder="alerts@khabarmonkey.com"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Receive instant email if any social token expires or fails health check.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: AUTO RETRY */}
        {activeTab === 'retry' && (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
              <RotateCw className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Auto-Retry Failed Dispatches Engine
                </h3>
                <p className="text-[11px] text-slate-400">
                  When temporary API rate-limits or network glitches occur, the auto-retry engine automatically recovers the post.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRetryEnabled}
                  onChange={(e) => setAutoRetryEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Enable Auto-Retry Background Worker
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    Regularly scans for failed dispatches and re-queues them with exponential backoff.
                  </span>
                </div>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Max Retry Attempts
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={autoRetryMax}
                    onChange={(e) => setAutoRetryMax(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] text-xs text-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Default: 3 attempts per post</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Interval Between Retries (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={autoRetryIntervalMin}
                    onChange={(e) => setAutoRetryIntervalMin(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] text-xs text-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Spacing between retry attempts</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SENSITIVE WORD FILTER */}
        {activeTab === 'words' && (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Anti-Ban Prohibited Word Obfuscator
                </h3>
                <p className="text-[11px] text-slate-400">
                  Inserts zero-width spaces (\u200B) into sensitive terms (मौत, हत्या, हादसा) so human readers see clean text while Facebook bots skip penalties.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Prohibited Word List (Separated by commas)
              </label>
              <textarea
                rows={5}
                value={sensitiveWordsRaw}
                onChange={(e) => setSensitiveWordsRaw(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-500 font-sans leading-relaxed"
              />
            </div>

            {/* Test Sandbox */}
            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-3">
              <span className="text-xs font-bold text-slate-800 block">
                🧪 Live Sanitizer Sandbox Test
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testHeadline}
                  onChange={(e) => setTestHeadline(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs text-slate-900 focus:outline-none"
                  placeholder="Type a news headline with sensitive words..."
                />
                <button
                  type="button"
                  onClick={handleTestSanitize}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black transition-colors shrink-0 shadow-2xs"
                >
                  Test Obfuscate
                </button>
              </div>

              {testResult && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium leading-relaxed">
                  {testResult}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CRON AUTOMATION */}
        {activeTab === 'cron' && (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
              <Radio className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Cron Automation & Worker Webhook
                </h3>
                <p className="text-[11px] text-slate-400">
                  Use this webhook URL in your Linux crontab or cron-job.org to process posts exactly on schedule.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Background Cron Endpoint
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${currentOrigin}/api/cron/process-queue?secret=${cronSecret}`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] text-xs font-mono text-slate-700 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${currentOrigin}/api/cron/process-queue?secret=${cronSecret}`,
                      'cron_url'
                    )
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 hover:bg-black shadow-2xs transition-colors"
                >
                  {copiedField === 'cron_url' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedField === 'cron_url' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  const newSec = 'sap_live_secret_' + Math.random().toString(36).substring(2, 14);
                  setCronSecret(newSec);
                  alert('New cron secret generated. Click "Save Settings" below to persist.');
                }}
                className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8F9FA] text-xs font-bold text-slate-700 transition-colors"
              >
                Regenerate Cron Secret Key
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: PROFILE & TEAM */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
              <UserIcon className="w-5 h-5 text-slate-700" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  User Profile & Workspace
                </h3>
                <p className="text-[11px] text-slate-400">
                  Manage your display name, email, and workspace publishing limits.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] focus:bg-white text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Plan Tier
                </label>
                <div className="px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="uppercase">{workspace?.plan || 'PRO'} Plan</span>
                  <span className="text-[10px] text-slate-400">
                    {workspace?.monthlyPostsUsed || 0} / {workspace?.monthlyPostsLimit || 1500} posts used
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400 font-medium">
            <span>Changes are persisted to your local and user workspace storage immediately.</span>
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Direct Page Token Modal in Settings */}
      {showTokenConnectModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <SocialIcon platform="facebook" className="w-8 h-8 rounded-lg" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Connect Facebook Page Token</h3>
                  <p className="text-[11px] text-slate-400">Instant direct connection via Page Access Token</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTokenConnectModal(false)}
                className="w-7 h-7 rounded-xl bg-[#F8F9FA] text-slate-500 hover:text-slate-900 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {tokenConnectError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{tokenConnectError}</span>
              </div>
            )}

            {tokenConnectSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{tokenConnectSuccess}</span>
              </div>
            )}

            <form onSubmit={handleConnectDirectToken} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Facebook Page Access Token <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={directToken}
                  onChange={(e) => setDirectToken(e.target.value)}
                  placeholder="EAAB... (Paste your Page Token here)"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Specific Page ID (Optional)
                </label>
                <input
                  type="text"
                  value={directPageId}
                  onChange={(e) => setDirectPageId(e.target.value)}
                  placeholder="Leave empty to auto-import all pages"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowTokenConnectModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnectingToken}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isConnectingToken ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying with Meta...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify & Connect Pages</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Direct YouTube Channel Modal in Settings */}
      {showYtConnectModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <SocialIcon platform="youtube" className="w-8 h-8 rounded-lg" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Connect YouTube Channel</h3>
                  <p className="text-[11px] text-slate-400">Direct connection via Channel Handle or ID</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowYtConnectModal(false)}
                className="w-7 h-7 rounded-xl bg-[#F8F9FA] text-slate-500 hover:text-slate-900 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {ytConnectError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{ytConnectError}</span>
              </div>
            )}

            {ytConnectSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{ytConnectSuccess}</span>
              </div>
            )}

            <form onSubmit={handleConnectDirectYouTube} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  YouTube Channel Handle or Channel ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={directYtInput}
                  onChange={(e) => setDirectYtInput(e.target.value)}
                  placeholder="e.g. @khabarmonkey or UCxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter your channel handle with @ or direct UC... ID
                </p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  YouTube API Key (Optional)
                </label>
                <input
                  type="text"
                  value={directYtApiKey}
                  onChange={(e) => setDirectYtApiKey(e.target.value)}
                  placeholder="AIzaSy... (Leave empty to use default)"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowYtConnectModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnectingYt}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isConnectingYt ? (
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
          </div>
        </div>
      )}
    </div>
  );
}
