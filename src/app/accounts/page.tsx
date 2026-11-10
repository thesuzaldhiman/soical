'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { Platform } from '@/types';
import {
  Users2,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Copy,
  ExternalLink,
  Info,
} from 'lucide-react';

export default function AccountsPage() {
  return (
    <AppShell>
      <AccountsContent />
    </AppShell>
  );
}

function AccountsContent() {
  const { accounts, pages, addAccount, removeAccount, togglePageActive } = useApp();

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('facebook');
  const [accountNameInput, setAccountNameInput] = useState('');
  const [copiedUri, setCopiedUri] = useState(false);

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app';

  const redirectUriMap: Record<Platform, string> = {
    facebook: `${currentOrigin}/api/auth/callback/facebook`,
    instagram: `${currentOrigin}/api/auth/callback/facebook`,
    threads: `${currentOrigin}/api/auth/callback/threads`,
    youtube: `${currentOrigin}/api/auth/callback/youtube`,
    telegram: 'No redirect URI needed (Bot Token only)',
  };

  const handleCopyUri = () => {
    navigator.clipboard.writeText(redirectUriMap[selectedPlatform]);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNameInput.trim()) return;
    addAccount(selectedPlatform, accountNameInput.trim());
    setAccountNameInput('');
    setConnectModalOpen(false);
  };

  const platformMeta: Record<
    Platform,
    { name: string; icon: string; color: string; desc: string }
  > = {
    facebook: {
      name: 'Facebook Pages',
      icon: '📘',
      color: 'bg-blue-600',
      desc: 'Graph API v19.0 with Pages Read, Manage & Publish Video permissions.',
    },
    instagram: {
      name: 'Instagram Business',
      icon: '📸',
      color: 'bg-pink-600',
      desc: 'Auto-discovered via connected Facebook Pages with Content Publishing API.',
    },
    threads: {
      name: 'Threads Profile',
      icon: '🧵',
      color: 'bg-slate-900',
      desc: 'Direct Meta Threads API OAuth (uses the same App ID as Facebook).',
    },
    telegram: {
      name: 'Telegram Bot & Channel',
      icon: '✈️',
      color: 'bg-sky-500',
      desc: 'Instant broadcast to Telegram Channels/Groups via Bot Token.',
    },
    youtube: {
      name: 'YouTube Shorts Channel',
      icon: '▶️',
      color: 'bg-red-600',
      desc: 'Google OAuth2 Data API v3 for 9:16 Shorts cross-posting + custom thumbnails.',
    },
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users2 className="w-6 h-6 text-blue-600" />
            <span>Connected Accounts & Channels</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage your social OAuth connections, page permissions, and channel activation toggles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setConnectModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Platform</span>
        </button>
      </div>

      {/* Connected Accounts Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Connected Profiles & Authentications
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const meta = platformMeta[acc.platform];
            return (
              <div
                key={acc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.icon}</span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">{acc.name}</h3>
                      <span className="text-[11px] text-slate-400 font-medium capitalize">
                        {acc.platform}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Token Encryption:</span>
                    <span className="font-mono text-emerald-700 font-semibold">AES-256-CBC</span>
                  </div>
                  {acc.tokenExpiresAt && (
                    <div className="flex items-center justify-between">
                      <span>Token Expires:</span>
                      <span className="text-slate-700 font-medium">
                        {new Date(acc.tokenExpiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh Token</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAccount(acc.id)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pages & Channels Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Destination Channels / Pages</h2>
            <p className="text-xs text-slate-500">
              Turn pages ON or OFF. Disabled pages won&apos;t receive automated dispatches.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {pages.filter((p) => p.isActive).length} Active Targets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-5">Target Channel</th>
                <th className="py-3 px-5">Platform</th>
                <th className="py-3 px-5">Audience / Fans</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5 text-right">Active Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {p.pageId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="capitalize font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>{platformMeta[p.platform]?.icon}</span>
                      <span>{p.platform}</span>
                    </span>
                  </td>
                  <td className="py-4 px-5 font-semibold text-slate-800">
                    {p.fanCount.toLocaleString()}
                  </td>
                  <td className="py-4 px-5 text-slate-500">{p.category || 'General'}</td>
                  <td className="py-4 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => togglePageActive(p.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        p.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 hover:text-slate-700'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connect Platform Modal */}
      {connectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Connect Social Account</h3>
              <button
                type="button"
                onClick={() => setConnectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Platform Selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Select Platform
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['facebook', 'instagram', 'threads', 'youtube', 'telegram'] as Platform[]).map(
                  (plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setSelectedPlatform(plat)}
                      className={`p-3 rounded-xl border text-xs font-bold capitalize flex items-center gap-2 transition-all ${
                        selectedPlatform === plat
                          ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{platformMeta[plat]?.icon}</span>
                      <span>{plat}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Vercel OAuth Callback Info */}
            {selectedPlatform !== 'telegram' && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Vercel OAuth Redirect URI:</span>
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Add this URI to your Meta Developer App / Google Cloud Console OAuth redirect settings:
                </p>
                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 font-mono text-[11px]">
                  <span className="truncate">{redirectUriMap[selectedPlatform]}</span>
                  <button
                    type="button"
                    onClick={handleCopyUri}
                    className="ml-2 text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedUri ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Account Display Name Input */}
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
                  placeholder={`e.g. My News Page (${selectedPlatform})`}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Connect & Import Channels
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
