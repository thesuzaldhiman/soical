'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { DEFAULT_SENSITIVE_WORDS, sanitizeText, findSensitiveWords } from '@/lib/utils/sensitive-words';
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
  Play,
  Terminal,
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}

function SettingsContent() {
  const { user, workspace, updateUser, updateWorkspace } = useApp();

  const [activeTab, setActiveTab] = useState<'facebook' | 'youtube' | 'retry' | 'words' | 'cron' | 'profile'>('facebook');

  // Facebook App
  const [fbAppId, setFbAppId] = useState('109283746501928');
  const [fbAppSecret, setFbAppSecret] = useState('k8f93a7d2b0e419287346102');
  const [showFbSecret, setShowFbSecret] = useState(false);

  // YouTube
  const [ytClientId, setYtClientId] = useState('1092837465019-abc123xyz789.apps.googleusercontent.com');
  const [ytClientSecret, setYtClientSecret] = useState('GOCSPX-928374619283746');
  const [ytAutoShort, setYtAutoShort] = useState(true);
  const [ytDescriptionTemplate, setYtDescriptionTemplate] = useState(
    "{title}\n\n👉 ताज़ा और महत्वपूर्ण खबरों के लिए चैनल सब्सक्राइब करें!\n#Shorts #News #Viral"
  );
  const [alertEmail, setAlertEmail] = useState('suzal@khabarmonkey.com');

  // Auto-Retry
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);
  const [autoRetryMax, setAutoRetryMax] = useState(3);
  const [autoRetryIntervalMin, setAutoRetryIntervalMin] = useState(15);

  // Sensitive Words
  const [sensitiveWordsRaw, setSensitiveWordsRaw] = useState(DEFAULT_SENSITIVE_WORDS.join(', '));
  const [testHeadline, setTestHeadline] = useState('हिमाचल में दर्दनाक सड़क हादसा, 3 की मौत, 5 घायल');
  const [testResult, setTestResult] = useState('');

  // Cron
  const [cronSecret, setCronSecret] = useState('sap_live_secret_k8f93a7d2b0e');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Profile & Workspace
  const [userName, setUserName] = useState(user.name);
  const [userEmail, setUserEmail] = useState(user.email);
  const [workspaceName, setWorkspaceName] = useState(workspace.name);

  // Save notice
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://app.socialautoposter.pro';

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name: userName, email: userEmail });
    updateWorkspace({ name: workspaceName });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 font-sans max-w-5xl animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EEF1F6]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Platform Settings & Anti-Ban Controls
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Configure Facebook own app credentials, YouTube Google API, anti-ban dictionary, and auto-retry engine.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#EEF1F6] shadow-2xs overflow-x-auto">
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
            className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#FF007A] to-[#FF4E98] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#F6F8FD]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: FACEBOOK APP */}
        {activeTab === 'facebook' && (
          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-6 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F6]">
              <span className="text-xl">📘</span>
              <h3 className="font-extrabold text-sm text-slate-900">
                Own Facebook App Settings
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Connect via your own Meta Developers App. This ensures your posts carry your verified business branding and avoid shared proxy restrictions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Facebook App ID <span className="text-[#FF007A]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fbAppId}
                  onChange={(e) => setFbAppId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono text-slate-900 focus:outline-none focus:border-[#FF007A]"
                  placeholder="e.g. 109283746501928"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Facebook App Secret <span className="text-[#FF007A]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showFbSecret ? 'text' : 'password'}
                    required
                    value={fbAppSecret}
                    onChange={(e) => setFbAppSecret(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono text-slate-900 focus:outline-none focus:border-[#FF007A]"
                    placeholder="••••••••••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFbSecret(!showFbSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono text-slate-600 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${currentOrigin}/api/auth/callback/facebook`,
                      'fb_uri'
                    )
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
                >
                  {copiedField === 'fb_uri' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedField === 'fb_uri' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Paste this into developers.facebook.com → Facebook Login → Settings → Valid OAuth Redirect URIs.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: YOUTUBE & VIDEO */}
        {activeTab === 'youtube' && (
          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-6 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F6]">
              <span className="text-xl">▶️</span>
              <h3 className="font-extrabold text-sm text-slate-900">
                YouTube Data API v3 & Shorts Settings
              </h3>
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono text-slate-900 focus:outline-none focus:border-[#FF007A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Google OAuth Client Secret
                </label>
                <input
                  type="password"
                  value={ytClientSecret}
                  onChange={(e) => setYtClientSecret(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono text-slate-900 focus:outline-none focus:border-[#FF007A]"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ytAutoShort}
                  onChange={(e) => setYtAutoShort(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FF007A] focus:ring-[#FF007A]"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 focus:outline-none focus:border-[#FF007A]"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 focus:outline-none focus:border-[#FF007A]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Receive instant email if any social token expires or fails health check.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: AUTO RETRY */}
        {activeTab === 'retry' && (
          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-6 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F6]">
              <RotateCw className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Auto-Retry Failed Dispatches Engine
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              When temporary API rate-limits or network glitches occur, the auto-retry engine automatically recovers the post without requiring manual intervention.
            </p>

            <div className="space-y-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRetryEnabled}
                  onChange={(e) => setAutoRetryEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Spacing between retry attempts</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SENSITIVE WORD FILTER */}
        {activeTab === 'words' && (
          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-6 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F6]">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Anti-Ban Prohibited Word Obfuscator
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Facebook&apos;s AI scraper penalizes posts containing violent or sensitive terms (like मौत, आत्महत्या, हादसा, रेप). Our engine inserts zero-width spaces (\u200B) into these words so human readers see clean text while Facebook bots skip penalties.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Prohibited Word List (Separated by commas)
              </label>
              <textarea
                rows={5}
                value={sensitiveWordsRaw}
                onChange={(e) => setSensitiveWordsRaw(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 focus:outline-none focus:border-[#FF007A]"
              />
            </div>

            {/* Test Sandbox */}
            <div className="p-4 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] space-y-3">
              <span className="text-xs font-bold text-slate-800 block">
                🧪 Live Sanitizer Sandbox Test
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testHeadline}
                  onChange={(e) => setTestHeadline(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-[#EEF1F6] bg-white text-xs text-slate-900"
                  placeholder="Type a news headline with sensitive words..."
                />
                <button
                  type="button"
                  onClick={handleTestSanitize}
                  className="px-3 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shrink-0"
                >
                  Test Obfuscate
                </button>
              </div>

              {testResult && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  {testResult}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CRON AUTOMATION */}
        {activeTab === 'cron' && (
          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-6 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F6]">
              <Radio className="w-5 h-5 text-blue-500" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Cron Automation & Worker Webhook
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Use this webhook URL in your Linux crontab (e.g. <code>* * * * * curl -s &quot;URL&quot;</code>) or in an external monitoring service like cron-job.org to process posts exactly on schedule.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Background Cron Endpoint
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${currentOrigin}/api/cron/process-queue?secret=${cronSecret}`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono text-slate-700 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${currentOrigin}/api/cron/process-queue?secret=${cronSecret}`,
                      'cron_url'
                    )
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs shrink-0 flex items-center gap-1.5"
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
                  setCronSecret('sap_live_secret_' + Math.random().toString(36).substring(2, 14));
                  alert('New cron secret generated. Make sure to update your external cron jobs.');
                }}
                className="px-3 py-2 rounded-xl border border-[#EEF1F6] hover:bg-[#F6F8FD] text-xs font-bold text-slate-700 transition-colors"
              >
                Regenerate Cron Secret Key
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: PROFILE & TEAM */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-6 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F6]">
              <UserIcon className="w-5 h-5 text-slate-700" />
              <h3 className="font-extrabold text-sm text-slate-900">
                User Profile & Workspace
              </h3>
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Plan Tier
                </label>
                <div className="px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="uppercase">{workspace.plan} Plan</span>
                  <span className="text-[10px] text-slate-400">
                    {workspace.monthlyPostsUsed} / {workspace.monthlyPostsLimit} posts used
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF2E93] hover:from-[#E6006E] hover:to-[#E62080] text-white font-bold text-xs shadow-[0_4px_14px_rgba(255,0,122,0.3)] transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
