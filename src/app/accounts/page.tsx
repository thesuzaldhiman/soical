'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { Platform, SocialPage, SocialAccount } from '@/types';
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
    addAccount,
    removeAccount,
    togglePageActive,
    disconnectPage,
  } = useApp();

  // Selected account for deep page management modal (specifically for Facebook Pages)
  const [selectedPlatformModal, setSelectedPlatformModal] = useState<Platform | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectPlatformChoice, setConnectPlatformChoice] = useState<Platform>('facebook');
  const [accountNameInput, setAccountNameInput] = useState('');
  const [copiedUri, setCopiedUri] = useState(false);

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app';

  const redirectUriMap: Record<Platform, string> = {
    facebook: `${currentOrigin}/api/auth/callback/facebook`,
    instagram: `${currentOrigin}/api/auth/callback/facebook`,
    threads: `${currentOrigin}/api/auth/callback/threads`,
    youtube: `${currentOrigin}/api/auth/callback/youtube`,
    telegram: 'No redirect URI needed (Telegram Bot Token Only)',
  };

  const handleCopyUri = () => {
    navigator.clipboard.writeText(redirectUriMap[connectPlatformChoice]);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNameInput.trim()) return;
    addAccount(connectPlatformChoice, accountNameInput.trim());
    setAccountNameInput('');
    setConnectModalOpen(false);
  };

  const platformsConfig: {
    id: Platform;
    name: string;
    icon: string;
    description: string;
  }[] = [
    {
      id: 'facebook',
      name: 'Facebook',
      icon: '📘',
      description: 'Manage multiple Facebook Pages under your connected account.',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📸',
      description: 'Connected Instagram Business and Creator profiles.',
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: '▶️',
      description: 'Google OAuth2 verified channel for Shorts and video publishing.',
    },
    {
      id: 'threads',
      name: 'Threads',
      icon: '🧵',
      description: 'Meta Threads profile for micro-blogging cross-posts.',
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: '✈️',
      description: 'Telegram Bot connection for news channel alerts and broadcasts.',
    },
  ];

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EBEBE8]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Connected Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Manage your connected social platforms, authentications, and individual destination pages.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setConnectModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Connect Account</span>
        </button>
      </div>

      {/* 2. Platform Cards Grid (Each platform displayed separately in clean layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {platformsConfig.map((plat) => {
          const platformAccount = accounts.find((a) => a.platform === plat.id);
          const platformPages = pages.filter((p) => p.platform === plat.id);
          const isConnected = !!platformAccount || platformPages.length > 0;

          return (
            <div
              key={plat.id}
              className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-5"
            >
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{plat.icon}</span>
                    <div>
                      <h2 className="font-bold text-slate-900 text-base leading-tight">
                        {plat.name}
                      </h2>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
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
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#EEEEEC] flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      {plat.id === 'facebook'
                        ? 'Connected Pages:'
                        : plat.id === 'youtube'
                        ? 'Connected Channels:'
                        : 'Connected Profiles:'}
                    </span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-[#E4E4DF]">
                      {plat.id === 'facebook'
                        ? `${platformPages.length} Pages`
                        : `${platformPages.length} Active`}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[#F2F2EE] flex items-center justify-between gap-2">
                {plat.id === 'facebook' ? (
                  <button
                    type="button"
                    onClick={() => setSelectedPlatformModal('facebook')}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Users2 className="w-3.5 h-3.5" />
                    <span>View Pages ({platformPages.length})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedPlatformModal(plat.id)}
                    className="py-2 px-3 rounded-xl border border-[#E8E8E4] bg-white hover:bg-[#FAF9F6] text-slate-700 text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setConnectPlatformChoice(plat.id);
                    setConnectModalOpen(true);
                  }}
                  className="py-2 px-3 rounded-xl border border-[#E8E8E4] bg-white hover:bg-[#FAF9F6] text-slate-700 text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                  <span>{isConnected ? 'Reconnect' : 'Connect'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Facebook Page Management Modal (CRITICAL REQUIREMENT) */}
      {selectedPlatformModal === 'facebook' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E8E4] max-w-2xl w-full p-6 sm:p-8 shadow-2xl animate-fade-in space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#F0F0ED]">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📘</span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Facebook Account & Connected Pages
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Account: <strong className="text-slate-800">Suzal Dhiman</strong> • Multiple Facebook Pages available for publishing.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlatformModal(null)}
                className="w-8 h-8 rounded-full bg-[#F6F6F3] text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Account Info Pill */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900">
                  Graph API v19.0 OAuth Session Active
                </span>
              </div>
              <span className="text-[11px] font-bold text-blue-700">
                {pages.filter((p) => p.platform === 'facebook').length} Pages Accessible
              </span>
            </div>

            {/* List of Connected Pages */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Connected Pages List
              </div>

              {pages
                .filter((p) => p.platform === 'facebook')
                .map((page) => (
                  <div
                    key={page.id}
                    className="p-4 rounded-2xl border border-[#E8E8E4] bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Page Profile Image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={page.avatarUrl}
                        alt={page.name}
                        className="w-11 h-11 rounded-xl object-cover border border-[#E8E8E4] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm leading-snug">
                          {page.name}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                          <span>Page ID: {page.pageId}</span>
                          <span>•</span>
                          <span>{page.fanCount.toLocaleString()} followers</span>
                        </div>

                        {/* Available Permissions */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                          {(page.permissions || ['pages_manage_posts', 'pages_read_engagement']).map(
                            (perm, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-[#F6F6F3] text-slate-600 font-mono text-[9px] border border-[#EEEEEC]"
                              >
                                {perm}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Page Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => togglePageActive(page.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          page.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:text-slate-700'
                        }`}
                      >
                        {page.isActive ? 'Active' : 'Disabled'}
                      </button>

                      <button
                        type="button"
                        onClick={() => disconnectPage(page.id)}
                        className="p-2 rounded-xl border border-[#E8E8E4] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Disconnect this page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Modal Bottom Close */}
            <div className="pt-4 border-t border-[#F0F0ED] flex items-center justify-between">
              <span className="text-xs text-slate-400">
                You can select any combination of these pages when creating posts.
              </span>
              <button
                type="button"
                onClick={() => setSelectedPlatformModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Other Platform Details Modal */}
      {selectedPlatformModal && selectedPlatformModal !== 'facebook' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E8E4] max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-fade-in space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0ED]">
              <h2 className="text-base font-bold text-slate-900 capitalize flex items-center gap-2">
                <span>{selectedPlatformModal} Channel Details</span>
              </h2>
              <button
                type="button"
                onClick={() => setSelectedPlatformModal(null)}
                className="w-7 h-7 rounded-full bg-[#F6F6F3] text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {pages
                .filter((p) => p.platform === selectedPlatformModal)
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl border border-[#E8E8E4] bg-[#FAF9F6] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[#E8E8E4]"
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {p.fanCount.toLocaleString()} Subscribers / Fans
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Connected
                    </span>
                  </div>
                ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPlatformModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-950 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Connect Account Modal */}
      {connectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E8E4] max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-fade-in space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F0ED]">
              <h2 className="text-base font-bold text-slate-900">Connect Social Platform</h2>
              <button
                type="button"
                onClick={() => setConnectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
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
                    onClick={() => setConnectPlatformChoice(plat.id)}
                    className={`p-3 rounded-xl border text-xs font-bold capitalize flex items-center gap-2 transition-all ${
                      connectPlatformChoice === plat.id
                        ? 'bg-slate-950 border-slate-950 text-white shadow-xs'
                        : 'bg-[#F6F6F3] border-[#EEEEEC] text-slate-700 hover:bg-[#EAEAE6]'
                    }`}
                  >
                    <span>{plat.icon}</span>
                    <span>{plat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vercel OAuth Callback Info */}
            {connectPlatformChoice !== 'telegram' && (
              <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E8E4] text-xs text-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>Vercel OAuth Redirect URI:</span>
                </div>
                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-[#E0E0DC] font-mono text-[11px]">
                  <span className="truncate">{redirectUriMap[connectPlatformChoice]}</span>
                  <button
                    type="button"
                    onClick={handleCopyUri}
                    className="ml-2 text-slate-800 hover:text-black font-bold flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedUri ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Display Name / Handle Input */}
            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Account Name / Handle
                </label>
                <input
                  type="text"
                  required
                  value={accountNameInput}
                  onChange={(e) => setAccountNameInput(e.target.value)}
                  placeholder={`e.g. My Channel (${connectPlatformChoice})`}
                  className="w-full p-3 rounded-xl border border-[#E8E8E4] text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-[#FAF9F6]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E8E8E4] text-xs font-semibold text-slate-600 hover:bg-[#FAF9F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-sm"
                >
                  Connect & Import Pages
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
