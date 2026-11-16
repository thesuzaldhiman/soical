'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/context/app-context';
import {
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Radio,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-xs font-semibold text-slate-400">
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isHydrated, loginWithEmail, logout } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const errorParam = searchParams.get('error');

  // Automatically redirect already logged in & approved users to dashboard
  useEffect(() => {
    if (
      isHydrated &&
      isAuthenticated &&
      user?.email &&
      !searchParams.get('logout') &&
      (user.approvalStatus === 'approved' || user.role === 'owner')
    ) {
      router.replace('/dashboard');
    }
  }, [isHydrated, isAuthenticated, user, searchParams, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    const cleanEmail = email.toLowerCase().trim();
    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    const res = await loginWithEmail(cleanEmail, password);
    if (res.success) {
      router.push('/dashboard');
    } else {
      setFormError(res.message);
      setSubmitting(false);
    }
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
          <span>Secure Workspace Session</span>
        </div>
      </div>

      {/* Main Login Card (Tasklify Clean Neutral Studio Aesthetic) */}
      <div className="max-w-md w-full mx-auto my-auto animate-fade-in">
        {isAuthenticated && user?.email ? (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-white shadow-xs mx-auto overflow-hidden flex items-center justify-center text-white font-bold text-xl">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {user.provider === 'email' ? 'Active Email Session' : 'Active Google Session'}
                </span>
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
                className="w-full py-2.5 px-4 rounded-xl border border-[#E2E8F0] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
              >
                Sign Out / Use Another Account
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-5">
            {/* Header */}
            <div className="text-center space-y-1.5">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">
                <Radio className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Sign in to Workspace
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Sign in with your authorized administrator email &amp; password.
              </p>
            </div>

            {/* Form Error Banner */}
            {errorParam || formError ? (
              <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs flex items-start gap-2 text-left animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-950">Sign-In Failed</div>
                  <p className="text-[11px] text-rose-800 mt-0.5">{formError || errorParam}</p>
                </div>
              </div>
            ) : null}

            {/* Email & Password Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60"
              >
                <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Sign Up / Request Access Link */}
            <div className="text-center text-xs text-slate-500 pt-1">
              Don't have an account?{' '}
              <Link href="/signup" className="font-bold text-slate-900 hover:underline">
                Request Access / Sign Up
              </Link>
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
        <span>© 2026 Social Auto Poster. All rights reserved.</span>
      </div>
    </div>
  );
}
