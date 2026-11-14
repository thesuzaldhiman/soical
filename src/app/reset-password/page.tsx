'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Radio,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-xs font-semibold text-slate-400">
          Loading...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token || !email) {
      setError('Invalid reset link. Token ya email missing hai. Kripya naya link request karein.');
      return;
    }

    if (password.length < 6) {
      setError('Password kam se kam 6 characters ka hona chahiye.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Dono passwords match nahi kar rahe hain.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsSuccess(true);
      } else {
        setError(data.message || 'Password update karne me koi samasya aayi.');
      }
    } catch {
      setError('Server connection error. Kripya punah prayas karein.');
    } finally {
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
          <span>Encrypted Password Update</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto my-auto animate-fade-in">
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-5">
          {isSuccess ? (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Password Changed!
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Aapka password safaltapoorvak update ho gaya hai. Aap ab naye password se login kar sakte hain.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Sign In with New Password</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : !token || !email ? (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
                <AlertCircle className="w-7 h-7 stroke-[2.2]" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Invalid Reset Link
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Is reset link me token ya email parameter missing hai. Kripya naya password reset link generate karein.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/forgot-password"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Request New Reset Link</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center space-y-1.5">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Set New Password
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Account: <strong className="text-slate-800">{email}</strong>
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs flex items-start gap-2 text-left animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-950">Error</div>
                    <p className="text-[11px] text-rose-800 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Kam se kam 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Password punah enter karein"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60"
                >
                  <span>{submitting ? 'Updating password...' : 'Update & Save Password'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Back to Login */}
              <div className="text-center text-xs text-slate-500 pt-1 border-t border-[#E2E8F0]">
                Remember your password?{' '}
                <Link href="/login" className="font-bold text-slate-900 hover:underline">
                  Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-slate-400 py-2">
        <span>© 2026 Social Auto Poster. All rights reserved.</span>
      </div>
    </div>
  );
}
