'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/context/app-context';
import {
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Radio,
  Copy,
} from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-xs font-semibold text-slate-400">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const { user, isAuthenticated, logout } = useApp();

  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);

  const errorParam = searchParams.get('error');
  const isGoogleMissing = errorParam === 'google_client_id_missing';

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://soical.vercel.app';
  const googleRedirectUri = `${currentOrigin}/api/auth/callback/google`;

  const handleCopyUri = () => {
    navigator.clipboard.writeText(googleRedirectUri);
    setCopiedRedirectUri(true);
    setTimeout(() => setCopiedRedirectUri(false), 2000);
  };

  const handleLiveGoogleOAuth = () => {
    // Redirect to the server-side Google OAuth initiator
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Simple Brand Nav */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <Radio className="w-4 h-4 stroke-[2.4]" />
          </div>
          <span className="font-extrabold text-sm text-slate-900 tracking-tight">
            Social Auto Poster
          </span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>OAuth 2.0 Secure Session</span>
        </div>
      </div>

      {/* Main Login Card (Tasklify Clean Neutral Studio Aesthetic) */}
      <div className="max-w-md w-full mx-auto my-auto animate-fade-in">
        {isAuthenticated && user?.email ? (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-white shadow-xs mx-auto overflow-hidden flex items-center justify-center text-white font-bold text-xl">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Active Google Session</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{user.name}</h2>
              <p className="text-xs text-slate-500 font-medium">{user.email}</p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Link
                href="/dashboard"
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-2.5 px-4 rounded-xl border border-[#E2E8F0] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 font-semibold text-xs transition-colors"
              >
                Sign Out / Use Another Account
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">
                <GoogleGLogo className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Sign in with Google
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Access your multi-platform broadcasting workspace, connected Facebook Pages, and Telegram channels.
              </p>
            </div>

            {/* Google OAuth Error / Setup Helper Banner */}
            {isGoogleMissing ? (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-2 text-left animate-fade-in">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Google Client ID Setup Required</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  To enable live Google OAuth popup on Vercel, add <strong>GOOGLE_CLIENT_ID</strong> and <strong>GOOGLE_CLIENT_SECRET</strong> in your Vercel Environment Variables.
                </p>
                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-200 font-mono text-[10px]">
                  <span className="truncate">{googleRedirectUri}</span>
                  <button
                    type="button"
                    onClick={handleCopyUri}
                    className="ml-2 font-bold text-slate-900 hover:text-black flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedRedirectUri ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            ) : errorParam ? (
              <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs flex items-start gap-2 text-left animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-950">Google Sign-In Failed</div>
                  <p className="text-[11px] text-rose-800 mt-0.5">{errorParam}</p>
                </div>
              </div>
            ) : null}

            {/* Primary Action: Official Google Login Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleLiveGoogleOAuth}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span className="w-5 h-5 rounded-md bg-white flex items-center justify-center shrink-0">
                  <GoogleGLogo className="w-3.5 h-3.5" />
                </span>
                <span>Continue with Google</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Trust & Compliance Badge */}
            <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-slate-400">
              <span>🔒 Encrypted TLS Session</span>
              <span>Zero-Width Anti-Ban Active</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-slate-400 py-2">
        <span>© {new Date().getFullYear()} Social Auto Poster. All rights reserved.</span>
      </div>
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
