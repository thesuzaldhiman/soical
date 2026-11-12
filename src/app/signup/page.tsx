'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context/app-context';
import {
  ShieldCheck,
  ArrowRight,
  Radio,
  Lock,
  Mail,
  User,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { SubscriptionTier } from '@/types';

export default function SignupPage() {
  const router = useRouter();
  const { registerUser } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>('pro');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = registerUser(name, email, selectedPlan, password);
      if (res.success) {
        // Redirect to dashboard where ApprovalGate handles the pending screen
        router.push('/dashboard');
      } else {
        setError(res.message);
        setLoading(false);
      }
    } catch {
      setError('Something went wrong during signup. Please try again.');
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'starter' as SubscriptionTier,
      title: 'Starter',
      subtitle: '5 Pages • 30 posts/day',
      badge: 'Basic',
    },
    {
      id: 'pro' as SubscriptionTier,
      title: 'Pro',
      subtitle: '15 Pages • 100 posts/day • AI',
      badge: 'Popular',
      highlight: true,
    },
    {
      id: 'agency' as SubscriptionTier,
      title: 'Agency',
      subtitle: '50 Pages • 500 posts/day • Unlimited',
      badge: 'Max Power',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <Radio className="w-4 h-4 stroke-[2.4]" />
          </div>
          <span className="font-extrabold text-sm text-slate-900 tracking-tight">
            Social Auto Poster
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Already have an account?
          </span>
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors shadow-2xs"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="max-w-md w-full mx-auto my-6 animate-fade-in">
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-5">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Create Your Account
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Join the multi-page auto poster and scheduler platform.
            </p>
          </div>

          {/* Admin Approval Notice Banner */}
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-amber-950">Admin Approval Policy: </span>
              Account register hone ke baad admin review karega aur validity/limits approve karega.
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="Create a strong password (6+ chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
              </div>
            </div>

            {/* Plan Preference Selection */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Select Plan to Request</span>
                <span className="text-[10px] text-slate-400 font-normal">Set by admin</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {plans.map((p) => {
                  const isSel = selectedPlan === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlan(p.id)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all relative ${
                        isSel
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-[#E2E8F0] bg-[#F8F9FA] hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">{p.title}</span>
                          {p.highlight && (
                            <span
                              className={`text-[8px] font-extrabold px-1 rounded ${
                                isSel ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              POPULAR
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[10px] line-clamp-2 leading-tight ${
                            isSel ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {p.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60"
              >
                <span>{loading ? 'Creating Account...' : 'Sign Up & Request Approval'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-[#E2E8F0]" />
            <span className="absolute bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Or
            </span>
          </div>

          {/* Google Quick Signup */}
          <a
            href="/api/auth/google"
            className="w-full py-2.5 px-4 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <GoogleGLogo className="w-4 h-4" />
            <span>Sign up with Google</span>
          </a>

          {/* Bottom helper */}
          <div className="pt-1 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-slate-900 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-slate-400 py-2">
        <span>© 2026 Social Auto Poster SaaS • Terms & Privacy</span>
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
