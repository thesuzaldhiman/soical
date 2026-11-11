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
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '@/lib/context/app-context';

export default function HomePage() {
  const { user, isAuthenticated, isHydrated, logout } = useApp();

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

          <div className="flex items-center gap-3">
            {isHydrated && isAuthenticated && user?.email ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="text-slate-300 font-medium truncate max-w-[120px]">{user.name}</span>
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 hover:scale-[1.02]"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 hover:scale-[1.02]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
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
          {isHydrated && isAuthenticated && user?.email ? (
            <>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-base font-bold shadow-xl shadow-blue-600/40 hover:scale-105 transition-all"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/composer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-base font-semibold border border-slate-700 transition-all"
              >
                <Palette className="w-5 h-5 text-purple-400" />
                <span>Create New Post</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-base font-bold shadow-xl shadow-blue-600/40 hover:scale-105 transition-all"
              >
                <GoogleGLogo className="w-5 h-5 shrink-0" />
                <span>Sign in with Google</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-base font-semibold border border-slate-700 transition-all"
              >
                <span>Login or Register Free</span>
              </Link>
            </>
          )}
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

function GoogleGLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
