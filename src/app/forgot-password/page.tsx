'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Radio,
  Mail,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ message: string; resetUrl?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Kripya ek valid email address enter karein.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessData({
          message: data.message,
          resetUrl: data.resetUrl,
        });
      } else {
        setError(data.message || 'Request process karne me koi problem aayi.');
      }
    } catch {
      setError('Server se connect nahi ho paya. Kripya thodi der baad koshish karein.');
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
          <span>Encrypted Recovery</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto my-auto animate-fade-in">
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-5">
          {successData ? (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Reset Link Sent!
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Humne password reset link <strong className="text-slate-800">{email}</strong> par bhej diya hai.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0] text-slate-600 text-xs text-left space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Check Your Inbox</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Apne email inbox aur spam/junk folder me check karein. Ye link agle <strong>60 minutes</strong> tak valid rahega.
                </p>
              </div>

              {successData.resetUrl && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-left space-y-1 text-xs">
                  <div className="text-[11px] font-bold text-amber-900">Direct Test Link:</div>
                  <Link
                    href={successData.resetUrl}
                    className="text-[11px] font-semibold text-blue-600 hover:underline break-all flex items-center gap-1"
                  >
                    <span>Click here to open Reset Page</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </Link>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center space-y-1.5">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">
                  <Mail className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Forgot Password?
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Apna registered email address enter karein. Hum aapko password reset link bhejenge.
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
              <form onSubmit={handleSubmit} className="space-y-4">
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

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60"
                >
                  <span>{submitting ? 'Sending reset link...' : 'Send Password Reset Link'}</span>
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
