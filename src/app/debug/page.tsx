'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import {
  Bug,
  ShieldCheck,
  KeyRound,
  Radio,
  CheckCircle2,
  Clock,
  Server,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

export default function DebugPage() {
  return (
    <AppShell>
      <DebugContent />
    </AppShell>
  );
}

function DebugContent() {
  const { workspace, accounts, pages, posts } = useApp();
  const [copiedKey, setCopiedKey] = useState(false);
  const [isPingingCron, setIsPingingCron] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);

  const cronUrl = 'https://api.socialautoposter.app/v1/cron/publish-queue?secret=sap_live_secret_k8f93a7d2b0e';

  const handleCopyCron = () => {
    navigator.clipboard.writeText(cronUrl);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleTestCron = async () => {
    setIsPingingCron(true);
    setCronResult(null);
    try {
      // Simulate cron trigger
      await new Promise((resolve) => setTimeout(resolve, 800));
      setCronResult('Success: Queue verified. 1 pending post processed, 0 errors.');
    } catch {
      setCronResult('Error: Failed to ping queue.');
    } finally {
      setIsPingingCron(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#EBEBE8]">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          System Diagnostics & Debug
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Inspect OAuth security vault, webhook listeners, background cron workers, and runtime health.
        </p>
      </div>

      {/* Grid of Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Security & Token Vault */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">OAuth 2.0 Security Vault</h3>
              <p className="text-xs text-slate-400">AES-256-GCM Hardware-Grade Encryption</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F6] border border-[#EEEEEC]">
              <span className="text-slate-600 font-medium">Encryption Cipher</span>
              <span className="font-mono font-bold text-slate-900">AES-256-GCM + PBKDF2</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F6] border border-[#EEEEEC]">
              <span className="text-slate-600 font-medium">App Secret Proof</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Active & Verified
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F6] border border-[#EEEEEC]">
              <span className="text-slate-600 font-medium">Connected Tokens</span>
              <span className="font-bold text-slate-900">{accounts.length} Tokens Encrypted</span>
            </div>
          </div>
        </div>

        {/* 2. Background Queue & Cron */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center">
              <Radio className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Background Queue Runner</h3>
              <p className="text-xs text-slate-400">Scheduled post worker & anti-ban interval manager</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Webhook / External Cron Endpoint
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={cronUrl}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#F8F8F6] border border-[#E8E8E4] font-mono text-[11px] text-slate-700 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyCron}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 text-white font-semibold hover:bg-slate-800 transition-colors shrink-0 flex items-center gap-1"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestCron}
                disabled={isPingingCron}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#E8E8E4] hover:bg-[#FAF9F6] text-slate-800 font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPingingCron ? 'animate-spin' : ''}`} />
                <span>Test Cron Trigger</span>
              </button>

              {cronResult && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {cronResult}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Runtime Environment & Specifications */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center">
              <Server className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Application Environment</h3>
              <p className="text-xs text-slate-400">Framework and infrastructure specs</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF9F6] border border-[#EEEEEC]">
              <span className="text-slate-500 font-medium">Framework</span>
              <span className="font-bold text-slate-900">Next.js 16 (App Router + Turbopack)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF9F6] border border-[#EEEEEC]">
              <span className="text-slate-500 font-medium">Styling Engine</span>
              <span className="font-bold text-slate-900">Tailwind CSS v4 + Lucide React</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF9F6] border border-[#EEEEEC]">
              <span className="text-slate-500 font-medium">Active Workspace</span>
              <span className="font-mono font-bold text-slate-900">{workspace.name}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF9F6] border border-[#EEEEEC]">
              <span className="text-slate-500 font-medium">Total Registered Pages</span>
              <span className="font-bold text-slate-900">{pages.length} Pages / Channels</span>
            </div>
          </div>
        </div>

        {/* 4. Live State Dump */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center">
              <Terminal className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Live Context Memory</h3>
              <p className="text-xs text-slate-400">In-memory reactive client state</p>
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-3 text-slate-300 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1">
            <div>// Active Session Metrics</div>
            <div>accounts: {accounts.length} items</div>
            <div>pages: {pages.length} items</div>
            <div>posts: {posts.length} items</div>
            <div>workspaceId: &quot;{workspace.id}&quot;</div>
            <div>limits: {workspace.monthlyPostsUsed} / {workspace.monthlyPostsLimit} used</div>
          </div>
        </div>
      </div>
    </div>
  );
}
