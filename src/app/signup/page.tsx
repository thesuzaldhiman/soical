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
  Clock,
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
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const res = await registerUser(name, email, selectedPlan, password);
      if (res.success) {
        setIsSubmitted(true);
        setLoading(false);
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
      {isSubmitted ? (
        <div className="max-w-md w-full mx-auto my-6 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <Clock className="w-8 h-8 animate-pulse stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Request Sent to Admin</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Registration Request Submitted!
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Aapka registration request admin panel me bhej diya gaya hai. Admin dwara request review aur approve hone ke baad hi aap login kar payenge.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] text-left text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-500">
                <span>Account Email:</span>
                <span className="font-bold text-slate-800">{email}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Requested Plan:</span>
                <span className="font-bold text-slate-800 uppercase">{selectedPlan}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  Pending Admin Approval
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <span>Back to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-md w-full mx-auto my-6 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1.5 text-center">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 uppercase tracking-wider mb-1">
                Request Platform Access
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create an Account</h1>
              <p className="text-xs text-slate-500 font-medium">
                Enter your details to request access. Admin approval is required before sign in.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-tight font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Sumit Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
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

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Plan Selection */}
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
                  <span>{loading ? 'Submitting Request...' : 'Sign Up & Request Approval'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Bottom helper */}
            <div className="pt-1 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-slate-900 hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-slate-400 py-2">
        <span>&copy; 2026 Social Auto Poster Pro • Terms & Privacy</span>
      </div>
    </div>
  );
}