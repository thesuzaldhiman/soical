'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { DEFAULT_SENSITIVE_WORDS, sanitizeText, findSensitiveWords } from '@/lib/utils/sensitive-words';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { SocialPage, MetaAppConfig } from '@/types';
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
  Edit2,
  Trash2,
  Star,
  Eye,
  EyeOff,
} from 'lucide-react';

const PAGE_INTERVAL_OPTIONS = [
  { label: '0 sec (Instant)', seconds: 0 },
  { label: '15 sec', seconds: 15 },
  { label: '30 sec', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
  { label: '60 min', seconds: 3600 },
];

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

  // Multi-Meta Developer Apps
  const [metaApps, setMetaApps] = useState<MetaAppConfig[]>(settings?.metaApps || []);
  const [showMetaAppModal, setShowMetaAppModal] = useState(false);
  const [editingMetaAppId, setEditingMetaAppId] = useState<string | null>(null);
  const [metaAppNameInput, setMetaAppNameInput] = useState('');
  const [metaAppIdInput, setMetaAppIdInput] = useState('');
  const [metaAppSecretInput, setMetaAppSecretInput] = useState('');
  const [metaAppIsDefault, setMetaAppIsDefault] = useState(false);
  const [metaAppNotes, setMetaAppNotes] = useState('');
  const [showModalSecret, setShowModalSecret] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

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

  // Page Interval (Random Range in seconds)
  const [pageIntervalMinSeconds, setPageIntervalMinSeconds] = useState(settings?.pageIntervalMinSeconds ?? 0);
  const [pageIntervalMaxSeconds, setPageIntervalMaxSeconds] = useState(settings?.pageIntervalMaxSeconds ?? 0);

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
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://game.khabarmonkey.com';

  // Sync inputs when settings hydrate from localStorage
  useEffect(() => {
    if (isHydrated && settings) {
      if (settings.metaAppId !== undefined) setFbAppId(settings.metaAppId);
      if (settings.metaAppSecret !== undefined) setFbAppSecret(settings.metaAppSecret);

      let apps = settings.metaApps && Array.isArray(settings.metaApps) ? [...settings.metaApps] : [];
      if (apps.length === 0 && settings.metaAppId) {
        apps = [
          {
            id: 'meta_app_primary',
            name: 'Primary Meta Developer App',
            appId: settings.metaAppId,
            appSecret: settings.metaAppSecret || '',
            isDefault: true,
            createdAt: new Date().toISOString(),
          },
        ];
      }
      setMetaApps(apps);
      if (settings.ytClientId !== undefined) setYtClientId(settings.ytClientId);
      if (settings.ytClientSecret !== undefined) setYtClientSecret(settings.ytClientSecret);
      if (settings.ytApiKey !== undefined) setYtApiKey(settings.ytApiKey);
      if (settings.ytAutoShort !== undefined) setYtAutoShort(settings.ytAutoShort);
      if (settings.ytDescriptionTemplate !== undefined) setYtDescriptionTemplate(settings.ytDescriptionTemplate);
      if (settings.alertEmail !== undefined) setAlertEmail(settings.alertEmail);
      if (settings.autoRetryEnabled !== undefined) setAutoRetryEnabled(settings.autoRetryEnabled);
      if (settings.autoRetryMax !== undefined) setAutoRetryMax(settings.autoRetryMax);
      if (settings.autoRetryIntervalMin !== undefined) setAutoRetryIntervalMin(settings.autoRetryIntervalMin);
      if (settings.pageIntervalMinSeconds !== undefined) setPageIntervalMinSeconds(settings.pageIntervalMinSeconds);
      if (settings.pageIntervalMaxSeconds !== undefined) setPageIntervalMaxSeconds(settings.pageIntervalMaxSeconds);
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

  const handleOpenAddMetaApp = () => {
    setEditingMetaAppId(null);
    setMetaAppNameInput('');
    setMetaAppIdInput('');
    setMetaAppSecretInput('');
    setMetaAppIsDefault(metaApps.length === 0);
    setMetaAppNotes('');
    setShowModalSecret(false);
    setShowMetaAppModal(true);
  };

  const handleOpenEditMetaApp = (app: MetaAppConfig) => {
    setEditingMetaAppId(app.id);
    setMetaAppNameInput(app.name);
    setMetaAppIdInput(app.appId);
    setMetaAppSecretInput(app.appSecret);
    setMetaAppIsDefault(Boolean(app.isDefault));
    setMetaAppNotes(app.notes || '');
    setShowModalSecret(false);
    setShowMetaAppModal(true);
  };

  const handleSaveMetaAppModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaAppNameInput.trim() || !metaAppIdInput.trim() || !metaAppSecretInput.trim()) return;

    let updatedApps: MetaAppConfig[];

    if (editingMetaAppId) {
      updatedApps = metaApps.map((a) => {
        if (a.id === editingMetaAppId) {
          return {
            ...a,
            name: metaAppNameInput.trim(),
            appId: metaAppIdInput.trim(),
            appSecret: metaAppSecretInput.trim(),
            notes: metaAppNotes.trim() || undefined,
            isDefault: metaAppIsDefault || a.isDefault,
          };
        }
        return metaAppIsDefault ? { ...a, isDefault: false } : a;
      });
    } else {
      const newApp: MetaAppConfig = {
        id: `meta_app_${Date.now()}`,
        name: metaAppNameInput.trim(),
        appId: metaAppIdInput.trim(),
        appSecret: metaAppSecretInput.trim(),
        isDefault: metaAppIsDefault || metaApps.length === 0,
        notes: metaAppNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      if (newApp.isDefault) {
        updatedApps = [newApp, ...metaApps.map((a) => ({ ...a, isDefault: false }))];
      } else {
        updatedApps = [...metaApps, newApp];
      }
    }

    if (!updatedApps.some((a) => a.isDefault) && updatedApps.length > 0) {
      updatedApps[0].isDefault = true;
    }

    setMetaApps(updatedApps);

    const defaultApp = updatedApps.find((a) => a.isDefault) || updatedApps[0];
    if (defaultApp) {
      setFbAppId(defaultApp.appId);
      setFbAppSecret(defaultApp.appSecret);
    }

    updateSettings({
      metaApps: updatedApps,
      metaAppId: defaultApp ? defaultApp.appId : fbAppId,
      metaAppSecret: defaultApp ? defaultApp.appSecret : fbAppSecret,
    });

    setShowMetaAppModal(false);
  };

  const handleDeleteMetaApp = (id: string) => {
    const appToDelete = metaApps.find((a) => a.id === id);
    if (!appToDelete) return;
    const connectedCount = pages.filter(
      (p) => p.platform === 'facebook' && (p.metaAppId === id || p.metaAppId === appToDelete.appId)
    ).length;

    const confirmMsg = connectedCount > 0
      ? `"${appToDelete.name}" is linked to ${connectedCount} connected page(s). Deleting it will leave those pages without their app configuration. Delete anyway?`
      : `Are you sure you want to delete Meta App "${appToDelete.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    let updatedApps = metaApps.filter((a) => a.id !== id);
    if (appToDelete.isDefault && updatedApps.length > 0) {
      updatedApps[0].isDefault = true;
    }

    setMetaApps(updatedApps);
    const defaultApp = updatedApps.find((a) => a.isDefault) || updatedApps[0];
    if (defaultApp) {
      setFbAppId(defaultApp.appId);
      setFbAppSecret(defaultApp.appSecret);
    }

    updateSettings({
      metaApps: updatedApps,
      metaAppId: defaultApp ? defaultApp.appId : '',
      metaAppSecret: defaultApp ? defaultApp.appSecret : '',
    });
  };

  const handleSetDefaultMetaApp = (id: string) => {
    const updatedApps = metaApps.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    setMetaApps(updatedApps);
    const defaultApp = updatedApps.find((a) => a.id === id);
    if (defaultApp) {
      setFbAppId(defaultApp.appId);
      setFbAppSecret(defaultApp.appSecret);
      updateSettings({
        metaApps: updatedApps,
        metaAppId: defaultApp.appId,
        metaAppSecret: defaultApp.appSecret,
      });
    }
  };

  const toggleRevealSecret = (appId: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [appId]: !prev[appId] }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const wordsArray = sensitiveWordsRaw
      .split(/[,;\n]+/)
      .map((w) => w.trim())
      .filter(Boolean);

    const defaultApp = metaApps.find((a) => a.isDefault) || metaApps[0];

    // 1. Save settings to state and persistent storage
    updateSettings({
      metaAppId: defaultApp ? defaultApp.appId : fbAppId.trim(),
      metaAppSecret: defaultApp ? defaultApp.appSecret : fbAppSecret.trim(),
      metaApps,
      ytClientId: ytClientId.trim(),
      ytClientSecret: ytClientSecret.trim(),
      ytApiKey: ytApiKey.trim(),
      ytAutoShort,
      ytDescriptionTemplate,
      alertEmail: alertEmail.trim(),
      autoRetryEnabled,
      autoRetryMax: Number(autoRetryMax) || 3,
      autoRetryIntervalMin: Number(autoRetryIntervalMin) || 15,
      pageIntervalMinSeconds: Number(pageIntervalMinSeconds) || 0,
      pageIntervalMaxSeconds: Math.max(Number(pageIntervalMinSeconds) || 0, Number(pageIntervalMaxSeconds) || 0),
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
    <div className="space-y-4 font-sans max-w-5xl animate-fade-in pb-8">
      {/* Header (Compact Modern Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
            Platform Settings & Anti-Ban Controls
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">
            Configure Facebook app credentials, YouTube API, anti-ban dictionary, and auto-retry engine.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 animate-fade-in shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📘</span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Meta (Facebook) Developer Applications
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Add multiple Facebook Developer Apps to connect different Facebook accounts and pages without Development Mode tester restrictions.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenAddMetaApp}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-2xs transition-all shrink-0 self-start sm:self-center"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Meta App</span>
              </button>
            </div>

            {/* List of Configured Meta Apps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Configured Meta Apps ({metaApps.length})
                </h4>
                <span className="text-[11px] text-slate-400">
                  Each app handles its own OAuth login and page tokens
                </span>
              </div>

              {metaApps.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-dashed border-[#CBD5E1] text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1877F2] flex items-center justify-center mx-auto text-lg font-bold">
                    📘
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">No Meta Developer Apps added yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Add your Facebook App ID and App Secret to start connecting your Facebook accounts and pages.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddMetaApp}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Meta Developer App</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {metaApps.map((app) => {
                    const linkedPages = pages.filter(
                      (p) => p.platform === 'facebook' && (p.metaAppId === app.id || p.metaAppId === app.appId)
                    );
                    const isSecretRevealed = Boolean(revealedSecrets[app.id]);

                    return (
                      <div
                        key={app.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          app.isDefault
                            ? 'bg-gradient-to-r from-blue-50/40 via-white to-white border-blue-200 shadow-2xs'
                            : 'bg-white border-[#E2E8F0] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#F1F5F9]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900">
                              {app.name}
                            </span>
                            {app.isDefault && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                                <span>Default App</span>
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              <span>{linkedPages.length} Page(s) linked</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!app.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultMetaApp(app.id)}
                                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8F9FA] text-[11px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
                              >
                                Set as Default
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditMetaApp(app)}
                              className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8F9FA] text-slate-600 hover:text-slate-900 transition-colors"
                              title="Edit Credentials"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMetaApp(app.id)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition-colors"
                              title="Delete Meta App"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Credentials Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              App ID
                            </span>
                            <div className="flex items-center gap-2 font-mono text-slate-800 bg-[#F8F9FA] px-2.5 py-1.5 rounded-xl border border-[#E2E8F0]">
                              <span className="truncate">{app.appId}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(app.appId, `appid_${app.id}`)}
                                className="ml-auto text-slate-400 hover:text-slate-700"
                                title="Copy App ID"
                              >
                                {copiedField === `appid_${app.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              App Secret
                            </span>
                            <div className="flex items-center gap-2 font-mono text-slate-800 bg-[#F8F9FA] px-2.5 py-1.5 rounded-xl border border-[#E2E8F0]">
                              <span className="truncate">
                                {isSecretRevealed ? app.appSecret : '••••••••••••••••••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleRevealSecret(app.id)}
                                className="ml-auto text-slate-400 hover:text-slate-700"
                                title={isSecretRevealed ? 'Hide Secret' : 'Show Secret'}
                              >
                                {isSecretRevealed ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(app.appSecret, `appsec_${app.id}`)}
                                className="text-slate-400 hover:text-slate-700"
                                title="Copy Secret"
                              >
                                {copiedField === `appsec_${app.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {app.notes && (
                          <p className="text-[11px] text-slate-500 italic pb-2">
                            Note: {app.notes}
                          </p>
                        )}

                        {/* Action CTA: OAuth login for this specific app */}
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[#F1F5F9]">
                          <span className="text-[11px] text-slate-500">
                            Ready to link Facebook account:
                          </span>
                          <a
                            href={`/api/auth/facebook?app_config_id=${encodeURIComponent(
                              app.id
                            )}&app_id=${encodeURIComponent(
                              app.appId.trim()
                            )}&app_secret=${encodeURIComponent(
                              app.appSecret.trim()
                            )}&app_name=${encodeURIComponent(app.name)}`}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold shadow-2xs transition-all hover:scale-[1.01]"
                          >
                            <SocialIcon platform="facebook" className="w-3.5 h-3.5 rounded-xs" />
                            <span>Connect Facebook Account via {app.name}</span>
                            <ExternalLink className="w-3 h-3 opacity-80" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Valid OAuth Redirect URI Card */}
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Valid OAuth Redirect URI (Same for all Meta Developer Apps)
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
                Paste this into developers.facebook.com → (Your App) → Facebook Login → Settings → Valid OAuth Redirect URIs.
              </p>
            </div>

            {/* Active Facebook Pages in Workspace summary & Instant Token */}
            <div className="pt-4 border-t border-[#E2E8F0] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Active Facebook Pages in Workspace
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {pages.filter((p) => p.platform === 'facebook').length} total Facebook page(s) connected across your Meta Developer Apps.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/pages"
                    className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1"
                  >
                    <span>Manage All Pages</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setTokenConnectError(null);
                      setTokenConnectSuccess(null);
                      setShowTokenConnectModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                    <span>Direct Token</span>
                  </button>
                </div>
              </div>

              {pages.filter((p) => p.platform === 'facebook').length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {pages
                    .filter((p) => p.platform === 'facebook')
                    .map((pg) => (
                      <div
                        key={pg.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-xs font-semibold text-slate-800 shadow-2xs"
                      >
                        <SocialIcon platform="facebook" className="w-4 h-4 rounded-xs" />
                        <span>{pg.name}</span>
                        {pg.metaAppName && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">
                            {pg.metaAppName}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">({pg.pageId})</span>
                      </div>
                    ))}
                </div>
              )}
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

            {/* Interval Between Pages (Random Range) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-4">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900">
                    Interval Between Pages (Random Range)
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    0–0 = simultaneous broadcast to all pages. With a range set, each page uses a different random delay inside the window (natural delivery, avoids bot patterns).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Min</span>
                  <select
                    value={pageIntervalMinSeconds}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPageIntervalMinSeconds(val);
                      if (val > pageIntervalMaxSeconds) setPageIntervalMaxSeconds(val);
                    }}
                    className="px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-500"
                  >
                    {PAGE_INTERVAL_OPTIONS.map((opt) => (
                      <option key={`min-${opt.seconds}`} value={opt.seconds}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-slate-400 font-bold">–</span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Max</span>
                  <select
                    value={pageIntervalMaxSeconds}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPageIntervalMaxSeconds(val);
                      if (val < pageIntervalMinSeconds) setPageIntervalMinSeconds(val);
                    }}
                    className="px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-500"
                  >
                    {PAGE_INTERVAL_OPTIONS.map((opt) => (
                      <option key={`max-${opt.seconds}`} value={opt.seconds}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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

      {/* Modal: Add or Edit Meta Developer App */}
      {showMetaAppModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] max-w-lg w-full p-6 shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="text-xl">📘</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingMetaAppId ? 'Edit Meta Developer App' : 'Add Meta Developer App'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Enter credentials from developers.facebook.com &rarr; App Settings &rarr; Basic
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMetaAppModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-[#F8F9FA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMetaAppModal} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  App Name / Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={metaAppNameInput}
                  onChange={(e) => setMetaAppNameInput(e.target.value)}
                  placeholder="e.g. Personal Account App or News Agency App"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Facebook App ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={metaAppIdInput}
                  onChange={(e) => setMetaAppIdInput(e.target.value)}
                  placeholder="e.g. 109283746501928"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Facebook App Secret <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showModalSecret ? 'text' : 'password'}
                    required
                    value={metaAppSecretInput}
                    onChange={(e) => setMetaAppSecretInput(e.target.value)}
                    placeholder="Enter Meta App Secret"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalSecret(!showModalSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-800"
                  >
                    {showModalSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={metaAppNotes}
                  onChange={(e) => setMetaAppNotes(e.target.value)}
                  placeholder="e.g. Owned by second Facebook profile"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs text-slate-900 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="metaAppIsDefaultCheckbox"
                  checked={metaAppIsDefault}
                  onChange={(e) => setMetaAppIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded-md text-slate-900 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="metaAppIsDefaultCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Set as Default Meta App
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowMetaAppModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingMetaAppId ? 'Update Meta App' : 'Save Meta App'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
