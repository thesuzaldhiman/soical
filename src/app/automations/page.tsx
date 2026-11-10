'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
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
} from 'lucide-react';

export default function AutomationsPage() {
  return (
    <AppShell>
      <AutomationsContent />
    </AppShell>
  );
}

function AutomationsContent() {
  const { automations, categories, settings, toggleAutomation, deleteAutomation, createAutomation } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [feedName, setFeedName] = useState('');
  const [feedType, setFeedType] = useState<'blogger' | 'wordpress' | 'rss'>('blogger');
  const [feedUrl, setFeedUrl] = useState('');
  const [targetCategory, setTargetCategory] = useState(categories[0]?.id || '');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app';
  const webhookUrl = `${currentOrigin}/api/webhook/wordpress?secret=${settings.webhookSecret}`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleCreateAutomation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedName.trim() || !feedUrl.trim()) return;

    createAutomation({
      name: feedName.trim(),
      type: feedType,
      feedUrl: feedUrl.trim(),
      targetCategoryId: targetCategory,
      isActive: true,
      intervalMinutes: feedType === 'wordpress' ? 0 : 15,
      autoGenerateImage: true,
      sigTemplateId: 'tmpl_1',
    });

    setFeedName('');
    setFeedUrl('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-teal-600" />
            <span>Automations & Feed Ingestion</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Automatically transform Blogger feeds, RSS updates, or WordPress published posts into high-converting social cards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Ingestion Automation</span>
        </button>
      </div>

      {/* WordPress Webhook Bridge Box */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">WordPress Webhook Connector URL</h2>
              <p className="text-xs text-slate-400">
                Put this webhook in your WordPress site or WP Connector Plugin to auto-dispatch live stories.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
            Realtime Active
          </span>
        </div>

        <div className="flex items-center justify-between bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-200">
          <span className="truncate pr-4">{webhookUrl}</span>
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 shrink-0"
          >
            <Copy className="w-4 h-4" />
            <span>{copiedWebhook ? 'Copied!' : 'Copy URL'}</span>
          </button>
        </div>
      </div>

      {/* Automations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {automations.map((auto) => {
          const cat = categories.find((c) => c.id === auto.targetCategoryId);

          return (
            <div
              key={auto.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-5"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                      {auto.type === 'blogger' ? 'B' : auto.type === 'wordpress' ? 'W' : 'R'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">{auto.name}</h3>
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">
                        Type: {auto.type}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAutomation(auto.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      auto.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {auto.isActive ? 'Running' : 'Paused'}
                  </button>
                </div>

                <div className="text-xs text-slate-600 space-y-2 mt-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 font-medium">
                  <div className="truncate">
                    <span className="font-bold text-slate-700">Source:</span>{' '}
                    <span className="font-mono text-slate-500">{auto.feedUrl}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Dispatches To:</span>{' '}
                    <span className="text-blue-700 font-semibold">{cat?.name || 'All Targets'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Processed: {auto.itemsProcessed} stories</span>
                    <span>Interval: {auto.intervalMinutes ? `${auto.intervalMinutes}m` : 'Realtime'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Auto SIG Card Enabled
                </span>
                <button
                  type="button"
                  onClick={() => deleteAutomation(auto.id)}
                  className="text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-fade-in space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">New Automated Ingestion</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAutomation} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Source Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['blogger', 'wordpress', 'rss'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFeedType(type)}
                      className={`p-2.5 rounded-xl border text-xs font-bold capitalize transition-all ${
                        feedType === type
                          ? 'bg-teal-50 border-teal-600 text-teal-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Feed / Stream Name
                </label>
                <input
                  type="text"
                  required
                  value={feedName}
                  onChange={(e) => setFeedName(e.target.value)}
                  placeholder="e.g. Daily Hindi News Blogger Feed"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Public Feed URL / Endpoint
                </label>
                <input
                  type="url"
                  required
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://myblog.blogspot.com/feeds/posts/default?alt=json"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Target Social Category Group
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.pageIds.length} pages)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-500/20"
                >
                  Start Automated Ingestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
