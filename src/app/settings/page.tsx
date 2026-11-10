'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import {
  Settings,
  ShieldCheck,
  Key,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Lock,
  Globe,
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}

function SettingsContent() {
  const { settings, updateSettings } = useApp();

  const [metaAppId, setMetaAppId] = useState(settings.metaAppId);
  const [metaAppSecret, setMetaAppSecret] = useState(settings.metaAppSecret);
  const [ytClientId, setYtClientId] = useState(settings.ytClientId);
  const [ytClientSecret, setYtClientSecret] = useState(settings.ytClientSecret);
  const [telegramBotToken, setTelegramBotToken] = useState(settings.telegramBotToken);
  const [openaiApiKey, setOpenaiApiKey] = useState(settings.openaiApiKey);
  const [cronSecretKey, setCronSecretKey] = useState(settings.cronSecretKey);

  // Sensitive Words
  const [sensitiveWords, setSensitiveWords] = useState<string[]>(settings.sensitiveWords);
  const [newWordInput, setNewWordInput] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordInput.trim()) return;
    const word = newWordInput.trim();
    if (!sensitiveWords.includes(word)) {
      setSensitiveWords([...sensitiveWords, word]);
    }
    setNewWordInput('');
  };

  const handleRemoveWord = (word: string) => {
    setSensitiveWords(sensitiveWords.filter((w) => w !== word));
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      metaAppId,
      metaAppSecret,
      ytClientId,
      ytClientSecret,
      telegramBotToken,
      openaiApiKey,
      cronSecretKey,
      sensitiveWords,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" />
            <span>Settings & API Vault</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure Meta App credentials, Google YouTube API keys, and sensitive anti-spam filters.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Meta / Facebook App Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Lock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Meta Developer App (Facebook & Threads)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Meta App ID
              </label>
              <input
                type="text"
                value={metaAppId}
                onChange={(e) => setMetaAppId(e.target.value)}
                placeholder="109283746591029"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Meta App Secret
              </label>
              <input
                type="password"
                value={metaAppSecret}
                onChange={(e) => setMetaAppSecret(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Found in Meta for Developers → App Dashboard → Settings → Basic.
          </p>
        </div>

        {/* Google / YouTube OAuth Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Lock className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Google Cloud API (YouTube Shorts)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Google Client ID
              </label>
              <input
                type="text"
                value={ytClientId}
                onChange={(e) => setYtClientId(e.target.value)}
                placeholder="918237465019-...apps.googleusercontent.com"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Google Client Secret
              </label>
              <input
                type="password"
                value={ytClientSecret}
                onChange={(e) => setYtClientSecret(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Telegram & AI Captions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Telegram Bot & AI Captions
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Telegram Bot Token
              </label>
              <input
                type="text"
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                placeholder="6892019485:AAEkL987_..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                OpenAI API Key (Optional)
              </label>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-proj-••••••••••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Sensitive / Spam Words Shield */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Sensitive & Spam Word Shield (Anti-Ban)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {sensitiveWords.length} words configured
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Words in this list are automatically scanned in Composer and sanitized by inserting zero-width
            spaces before reaching Facebook/Instagram scrapers.
          </p>

          {/* Add Word Form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newWordInput}
              onChange={(e) => setNewWordInput(e.target.value)}
              placeholder="Type word (e.g. हादसा, वारदात)..."
              className="flex-1 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddWord}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Word</span>
            </button>
          </div>

          {/* Tag Cloud */}
          <div className="flex flex-wrap gap-2 pt-2">
            {sensitiveWords.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-medium"
              >
                <span>{word}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveWord(word)}
                  className="text-amber-500 hover:text-rose-600 font-bold"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
