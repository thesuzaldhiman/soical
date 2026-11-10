'use client';

import React from 'react';
import Link from 'next/link';
import {
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Palette,
  Sparkles,
  BarChart3,
  Clock,
  Layers,
  Cpu,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-6 h-6 fill-white text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white">Social Auto Poster</span>
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                SaaS Pro
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Launch Tool</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-20 text-center flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4" />
          <span>Standalone Multi-Platform SaaS Suite</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
          Publish, Schedule & Generate Social Images{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Across 5 Platforms
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed font-normal">
          The ultimate automated social posting suite with native Devanagari (Hindi) news card generation,
          anti-spam sensitive word filter, non-blocking scheduled intervals, and unified analytics.
        </p>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-base font-bold shadow-xl shadow-blue-600/40 hover:scale-105 transition-all"
          >
            <span>Open Tool Dashboard</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/composer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-base font-semibold border border-slate-700 transition-all"
          >
            <Palette className="w-5 h-5 text-purple-400" />
            <span>Try Create Post Directly</span>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full mt-6">
          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white mb-2">5-Platform Publishing</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Post simultaneously to Facebook Pages, Instagram Business, Threads, Telegram Channels, and YouTube Shorts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white mb-2">Social Image Generator (SIG)</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Interactive Hindi Devanagari news card creator with dual-color phrase highlights and custom news templates.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white mb-2">Spam Word Shield</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Automated sensitive word detector for crime/death news headlines to protect Facebook Pages from flags.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>© 2026 Social Auto Poster Pro SaaS • Built for Creators & News Publishers</p>
      </footer>
    </div>
  );
}
