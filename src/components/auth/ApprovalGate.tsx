'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/context/app-context';
import {
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Mail,
  LogOut,
  Sparkles,
  UserCheck,
  Ban,
} from 'lucide-react';

interface ApprovalGateProps {
  children: React.ReactNode;
}

export function ApprovalGate({ children }: ApprovalGateProps) {
  const { user, logout } = useApp();

  // If user is owner or admin, or already approved, allow access
  const isApproved =
    user?.role === 'owner' ||
    user?.role === 'admin' ||
    user?.email?.toLowerCase().includes('suzal') ||
    user?.email?.toLowerCase().includes('khabarmonkey') ||
    user?.approvalStatus === 'approved';

  if (isApproved) {
    return <>{children}</>;
  }

  // Handle Suspended or Rejected
  if (user?.approvalStatus === 'suspended' || user?.approvalStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between p-4 sm:p-8 font-sans">
        <div className="max-w-xl w-full mx-auto my-auto animate-fade-in space-y-4">
          <div className="bg-white rounded-3xl border border-rose-200 p-8 shadow-xs space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 mx-auto flex items-center justify-center text-rose-600 shadow-xs">
              <Ban className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>
                  {user.approvalStatus === 'suspended' ? 'Account Suspended' : 'Registration Declined'}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Access Restricted by Administrator
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed font-medium max-w-md mx-auto">
                {user.rejectionReason ||
                  'Aapka account admin dwara review ke baad temporarily suspend kar diya gaya hai.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] text-left text-xs space-y-2 text-slate-600">
              <div className="flex justify-between items-center text-slate-500">
                <span>Account Email:</span>
                <span className="font-bold text-slate-900">{user.email}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Status:</span>
                <span className="font-bold uppercase tracking-wider text-rose-600 text-[10px]">
                  {user.approvalStatus}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href="mailto:suzal@khabarmonkey.com?subject=Appeal%20Account%20Access"
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Mail className="w-4 h-4" />
                <span>Contact Administrator</span>
              </a>
              <button
                type="button"
                onClick={() => logout()}
                className="py-3 px-4 rounded-xl border border-[#E2E8F0] hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex flex-col justify-between p-4 sm:p-8 font-sans">
      {/* Top Simple Brand Nav */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm text-slate-900 tracking-tight">
            Social Auto Poster
          </span>
        </Link>
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Pending Card (Clean Neutral Studio Aesthetic) */}
      <div className="max-w-xl w-full mx-auto my-auto animate-fade-in space-y-4">
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6">
          {/* Status Badge & Clock */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
                <Clock className="w-8 h-8 animate-pulse stroke-[2.2]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Awaiting Admin Approval</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Aapka Account Review Ke Liye Pending Hai
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed font-medium max-w-md">
              Aapka registration receive ho chuka hai. SaaS security aur anti-abuse verification ke liye Admin level se approve hone ke baad hi dashboard unlock hota hai.
            </p>
          </div>

          {/* User & Requested Plan Details */}
          <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Registration Overview
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px]">User Name</span>
                <p className="font-bold text-slate-900 truncate">{user.name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px]">Email Address</span>
                <p className="font-bold text-slate-900 truncate">{user.email}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px]">Requested Plan</span>
                <p className="font-bold text-emerald-700 capitalize">
                  {user.subscription?.tier || 'Starter'} Tier
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px]">Submission Time</span>
                <p className="font-bold text-slate-700">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Just now'}
                </p>
              </div>
            </div>
          </div>

          {/* What happens next roadmap */}
          <div className="space-y-2 text-xs">
            <span className="font-bold text-slate-900">Next Steps:</span>
            <div className="space-y-2 text-slate-600 text-[11px]">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Admin aapke email & domain details ko verify karega.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Subscription validity aur Facebook page posting limits assign hongi.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Jaise hi approve hoga, page reload karte hi aapka Dashboard live khul jayega.</span>
              </div>
            </div>
          </div>

          {/* Contact Admin & Signout */}
          <div className="pt-2 border-t border-[#E2E8F0] flex flex-col sm:flex-row gap-2.5">
            <a
              href="mailto:suzal@khabarmonkey.com?subject=Approve%20My%20Account%20Social%20Auto%20Poster"
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Admin to Fast-Track</span>
            </a>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Check Status / Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto text-center text-xs text-slate-400 py-2">
        <span>© 2026 Social Auto Poster SaaS • Admin Approval Required</span>
      </div>
    </div>
  );
}
