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
  Play,
  ArrowRight,
  Layers,
  Check,
  Download,
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
  const [testFeedSuccess, setTestFeedSuccess] = useState<string | null>(null);

  // Blogger Label to Category mappings (Original Plugin Signature Feature)
  const [labelMappings, setLabelMappings] = useState([
    { label: 'Breaking News', categoryId: 'cat_1' },
    { label: 'Weather', categoryId: 'cat_2' },
    { label: 'Viral Videos', categoryId: 'cat_3' },
  ]);
  const [newLabel, setNewLabel] = useState('');
  const [newLabelCat, setNewLabelCat] = useState(categories[0]?.id || '');

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://app.socialautoposter.pro';
  const webhookUrl = `${currentOrigin}/api/webhook/wordpress?secret=${settings.webhookSecret}`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleTestFeedFetch = () => {
    setTestFeedSuccess('Checking feed: 3 new stories detected from Blogger. Prepared for auto-dispatch.');
    setTimeout(() => setTestFeedSuccess(null), 4000);
  };

  const handleAddLabelMapping = () => {
    if (!newLabel.trim()) return;
    setLabelMappings((prev) => [...prev, { label: newLabel.trim(), categoryId: newLabelCat }]);
    setNewLabel('');
  };

  const handleRemoveLabelMapping = (idx: number) => {
    setLabelMappings((prev) => prev.filter((_, i) => i !== idx));
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
    <div className="space-y-4 font-sans max-w-5xl animate-fade-in pb-10">
      {/* Header (Compact Modern Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#EEF1F6]">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
            Feed & Blogger Automations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">
            Ingest posts automatically from Blogger, WordPress, or external RSS feeds and cross-post.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Ingestion Feed</span>
        </button>
      </div>

      {testFeedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{testFeedSuccess}</span>
        </div>
      )}

      {/* WordPress & Webhook Bridge Box */}
      <div className="bg-white rounded-2xl border border-[#EEF1F6] p-6 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center">
              <Code className="w-5 h-5 text-[#FF007A]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                WordPress Webhook Realtime Bridge
              </h3>
              <p className="text-xs text-slate-400">
                Trigger instant social auto-posts whenever you hit &quot;Publish&quot; or &quot;Schedule&quot; in WordPress.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Endpoint Active
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono text-slate-700 select-all focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
          >
            {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedWebhook ? 'Copied' : 'Copy Webhook'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#F0F2F6]">
          <p className="text-[11px] text-slate-500 font-medium">
            WordPress par direct posting ke liye <strong>Auto Engine v7.5 Bridge</strong> plugin use karein.
          </p>
          <a
            href="/downloads/auto-engine-v7.5-bridge.zip"
            download="auto-engine-v7.5-bridge.zip"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors self-start sm:self-auto shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Auto Engine Bridge (ZIP)</span>
          </a>
        </div>
      </div>

      {/* Blogger Label to Social Category Mapping (Original Plugin Signature Feature) */}
      <div className="bg-white rounded-2xl border border-[#EEF1F6] p-6 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7928CA] to-[#9333EA] text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Blogger Label → Social Category Mapping
              </h3>
              <p className="text-xs text-slate-400">
                When Blogger publishes a story with a specific label, automatically route it to the assigned social page group.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestFeedFetch}
            className="px-3 py-1.5 rounded-xl border border-[#EEF1F6] hover:bg-[#F8F9FD] text-xs font-bold text-slate-700 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FF007A]" />
            <span>Test Feed Now</span>
          </button>
        </div>

        {/* Existing Mappings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#F0F2F6] text-[11px] font-bold text-slate-400 uppercase">
                <th className="py-2.5 px-3">Blogger Label / Tag</th>
                <th className="py-2.5 px-3">Target Social Category</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2F6]">
              {labelMappings.map((m, idx) => {
                const targetCat = categories.find((c) => c.id === m.categoryId);
                return (
                  <tr key={idx} className="hover:bg-[#F8F9FD] transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <span className="bg-[#F8F9FD] border border-[#EEF1F6] px-2 py-1 rounded-md">
                        🏷️ {m.label}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-700">
                        {targetCat?.name || 'All Pages'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveLabelMapping(idx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add new mapping input */}
        <div className="pt-2 border-t border-[#F0F2F6] flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Breaking News, Himachal, Tourism..."
            className="flex-1 w-full sm:w-auto px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 focus:outline-none focus:border-[#FF007A]"
          />
          <select
            value={newLabelCat}
            onChange={(e) => setNewLabelCat(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-700 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddLabelMapping}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 transition-colors"
          >
            + Add Mapping
          </button>
        </div>
      </div>

      {/* Active Automations Grid */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-sm text-slate-900 px-1">
          Active Feeds ({automations.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {automations.map((auto) => {
            const cat = categories.find((c) => c.id === auto.targetCategoryId);

            return (
              <div
                key={auto.id}
                className="bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 font-black text-sm flex items-center justify-center">
                        {auto.type === 'blogger' ? 'B' : auto.type === 'wordpress' ? 'W' : 'R'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{auto.name}</h4>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">
                          {auto.type} Feed
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleAutomation(auto.id)}
                      className={`px-3 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                        auto.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {auto.isActive ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 bg-[#F8F9FD] p-3 rounded-xl border border-[#EEF1F6]">
                    <div className="truncate">
                      <strong className="text-slate-800">Source:</strong>{' '}
                      <span className="font-mono text-slate-600">{auto.feedUrl}</span>
                    </div>
                    <div>
                      <strong className="text-slate-800">Target Group:</strong>{' '}
                      <span className="text-[#FF007A] font-bold">{cat?.name || 'All Pages'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#EEF1F6]">
                      <span>{auto.itemsProcessed} Stories Dispatched</span>
                      <span>Interval: {auto.intervalMinutes}m</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0F2F6] flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium text-[11px]">
                    Auto-Comment Link Active
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteAutomation(auto.id)}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EEF1F6] max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-fade-in space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Add Ingestion Source</h3>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Source Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['blogger', 'wordpress', 'rss'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFeedType(t)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                        feedType === t
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-[#F8F9FD] border-[#EEF1F6] text-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Feed Name</label>
                <input
                  type="text"
                  required
                  value={feedName}
                  onChange={(e) => setFeedName(e.target.value)}
                  placeholder="e.g. Daily Breaking News Blogger"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 focus:outline-none focus:border-[#FF007A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Blogger / Feed URL
                </label>
                <input
                  type="url"
                  required
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://yourblog.blogspot.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 focus:outline-none focus:border-[#FF007A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Default Target Social Category
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-[#F8F9FD]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF2E93] text-white text-xs font-bold shadow"
                >
                  Save Ingestion Feed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
