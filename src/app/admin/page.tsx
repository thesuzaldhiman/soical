'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/context/app-context';
import {
  Users,
  Clock,
  CheckCircle2,
  Search,
  Ban,
  Trash2,
  Crown,
  Eye,
  X,
  Sliders,
  Shield,
  ShieldAlert,
  ArrowRight,
  Filter,
  RotateCcw,
  Settings,
} from 'lucide-react';
import { SubscriptionTier, User, UserSubscription } from '@/types';

export default function AdminDashboardPage() {
  const {
    user: currentUser,
    allUsers,
    approveUser,
    rejectUser,
    toggleUserSuspension,
    updateUserSubscription,
    deleteUser,
    switchActiveUser,
  } = useApp();

  const isAuthorizedAdmin =
    currentUser?.role === 'owner' ||
    currentUser?.role === 'admin' ||
    currentUser?.email?.toLowerCase().trim() === 'suzaldhiman@gmail.com' ||
    currentUser?.email?.toLowerCase().includes('suzal') ||
    currentUser?.email?.toLowerCase().includes('khabarmonkey');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'suspended'>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [rejectionTargetUser, setRejectionTargetUser] = useState<User | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isAuthorizedAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
          <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Access Restricted</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Admin Management Console sirf authorized platform administrator ke liye accessible hai.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Stats calculation
  const totalUsersCount = allUsers.length;
  const pendingUsers = allUsers.filter((u) => u.approvalStatus === 'pending');
  const approvedUsers = allUsers.filter((u) => u.approvalStatus === 'approved');
  const suspendedUsers = allUsers.filter((u) => u.approvalStatus === 'suspended');
  const paidUsersCount = allUsers.filter(
    (u) =>
      u.approvalStatus === 'approved' &&
      u.subscription &&
      u.subscription.tier !== 'free'
  ).length;

  // Filtered users for table
  const filteredUsers = allUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && u.approvalStatus === 'pending') ||
      (statusFilter === 'approved' && u.approvalStatus === 'approved') ||
      (statusFilter === 'suspended' && u.approvalStatus === 'suspended');
    const matchesTier =
      tierFilter === 'all' || (u.subscription?.tier && u.subscription.tier === tierFilter);
    return matchesSearch && matchesStatus && matchesTier;
  });

  const handleQuickApprove = (userId: string, tier: SubscriptionTier = 'pro') => {
    approveUser(userId, tier, 30);
    showToast('User account approved successfully with 30 days validity!');
  };

  const handleConfirmReject = () => {
    if (!rejectionTargetUser) return;
    rejectUser(rejectionTargetUser.id, rejectionReason || 'Registration declined by administrator.');
    setRejectionTargetUser(null);
    setRejectionReason('');
    showToast('User registration declined.');
  };

  return (
    <div className="space-y-4 font-sans max-w-6xl mx-auto animate-fade-in pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-lg flex items-center gap-2 border border-slate-800 animate-slide-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Studio Header (Compact Modern Studio matching Composer & Bulk Scheduler) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-900" />
            <span>Admin Management Console</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">
            Review user signups, approve accounts, customize subscription tiers, and control platform limits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] text-xs font-bold text-slate-800 shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                pendingUsers.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span>{pendingUsers.length} Pending Approvals</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] text-xs font-bold text-slate-800 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-slate-900" />
            <span>{totalUsersCount} Total Users</span>
          </div>
        </div>
      </div>

      {/* 2. Main Studio 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ==================== LEFT COLUMN (lg:col-span-8) ==================== */}
        <div className="lg:col-span-8 space-y-4">
          {/* Priority Section: Pending Approvals Queue */}
          {pendingUsers.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center">
                    !
                  </span>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Needs Your Approval ({pendingUsers.length})
                  </h2>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Priority Review
                </span>
              </div>

              <div className="space-y-2.5">
                {pendingUsers.map((pUser) => (
                  <div
                    key={pUser.id}
                    className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={pUser.name}
                        className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-slate-900 truncate">
                          {pUser.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium truncate">
                          {pUser.email}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                            Requested: {pUser.subscription?.tier || 'Starter'}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            • {pUser.createdAt ? new Date(pUser.createdAt).toLocaleDateString() : 'Today'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingUser(pUser)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Customize Plan & Limits"
                      >
                        <Sliders className="w-3 h-3 text-slate-400" />
                        <span>Customize</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRejectionTargetUser(pUser)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Decline
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Kya aap ${pUser.name} (${pUser.email}) ki registration request delete karna chahte hain?`)) {
                            deleteUser(pUser.id);
                            showToast(`Registration request for ${pUser.name} deleted.`);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                        title="Delete / Remove Request"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickApprove(pUser.id, pUser.subscription?.tier || 'pro')}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>1-Click Approve</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: All Users Directory Table Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">
                  1
                </span>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Registered Accounts Directory
                </h2>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-3 py-1 rounded-lg border border-[#E2E8F0] bg-[#F8F9FA] text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="pb-2.5 pl-1">User Details</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">Plan</th>
                    <th className="pb-2.5">Page &amp; Post Limits</th>
                    <th className="pb-2.5">Validity</th>
                    <th className="pb-2.5 pr-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        Koi user nahi mila matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const sub = u.subscription;
                      const isSuperAdmin = u.email?.toLowerCase().trim() === 'suzaldhiman@gmail.com';
                      const isCurrent = currentUser?.id === u.id || currentUser?.email?.toLowerCase().trim() === u.email?.toLowerCase().trim();

                      return (
                        <tr key={u.id} className="hover:bg-[#F8F9FA]/60 transition-colors">
                          {/* User */}
                          <td className="py-3 pl-1">
                            <div className="flex items-center gap-2.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                alt={u.name}
                                className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-extrabold text-xs text-slate-900 truncate flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isCurrent && (
                                    <span className="text-[8px] font-black px-1 rounded bg-slate-900 text-white">
                                      YOU
                                    </span>
                                  )}
                                  {isSuperAdmin && (
                                    <span className="text-[8px] font-black px-1 rounded bg-amber-100 text-amber-900">
                                      SUPER ADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Approval Status */}
                          <td className="py-3">
                            {u.approvalStatus === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Approved</span>
                              </span>
                            ) : u.approvalStatus === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending</span>
                              </span>
                            ) : u.approvalStatus === 'suspended' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                                <Ban className="w-3 h-3 text-rose-600" />
                                <span>Suspended</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                                {u.approvalStatus || 'Approved'}
                              </span>
                            )}
                          </td>

                          {/* Subscription Tier */}
                          <td className="py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-[#E2E8F0] font-black text-slate-800 uppercase tracking-tight text-[10px]">
                              <Crown className="w-2.5 h-2.5 text-amber-600" />
                              <span>{sub?.tier || 'Pro'}</span>
                            </span>
                          </td>

                          {/* Limits */}
                          <td className="py-3">
                            <div className="space-y-0.5 text-[11px]">
                              <div className="font-bold text-slate-700">
                                {sub?.maxConnectedPages ?? 15} Pages
                              </div>
                              <div className="text-slate-400 font-medium text-[10px]">
                                {sub?.maxDailyPosts ?? 100} posts/day
                              </div>
                            </div>
                          </td>

                          {/* Validity */}
                          <td className="py-3">
                            <div className="text-[11px]">
                              {sub?.expiresAt ? (
                                <div className="font-bold text-slate-800 text-[11px]">
                                  {new Date(sub.expiresAt).toLocaleDateString()}
                                </div>
                              ) : (
                                <span className="font-bold text-emerald-700 text-[10px]">
                                  Lifetime
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 pr-1 text-right">
                            <div className="inline-flex items-center gap-1">
                              {/* Edit Subscription */}
                              <button
                                type="button"
                                onClick={() => setEditingUser(u)}
                                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Edit Plan, Expiry & Limits"
                              >
                                <Sliders className="w-3 h-3" />
                              </button>

                              {/* Switch Active User (Demo preview) */}
                              <button
                                type="button"
                                onClick={() => {
                                  switchActiveUser(u.id);
                                  showToast(`Switched active view to ${u.name}`);
                                }}
                                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Preview portal as this user"
                              >
                                <Eye className="w-3 h-3" />
                              </button>

                              {/* Suspend Toggle */}
                              {!isSuperAdmin && !isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    toggleUserSuspension(u.id);
                                    showToast(
                                      u.approvalStatus === 'suspended'
                                        ? 'Account unsuspended'
                                        : 'Account suspended'
                                    );
                                  }}
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    u.approvalStatus === 'suspended'
                                      ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 bg-white'
                                      : 'border-[#E2E8F0] text-slate-500 hover:bg-rose-50 hover:text-rose-600 bg-white'
                                  }`}
                                  title={u.approvalStatus === 'suspended' ? 'Unsuspend' : 'Suspend'}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Remove User */}
                              {!isSuperAdmin && !isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Kya aap ${u.name} (${u.email}) ka account completely delete/remove karna chahte hain? Iska sara data server se delete ho jayega.`)) {
                                      deleteUser(u.id);
                                      showToast(`User ${u.name} successfully removed.`);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                  title="Remove / Delete User Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Subscription Architecture Reference Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">
                  2
                </span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  SaaS Subscription Plans &amp; Limits Matrix
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Standard baseline tiers</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-900">Free</span>
                  <span className="text-[9px] font-bold text-slate-400">₹0</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  2 Pages • 10 posts/day • Manual Composer
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-900">Starter</span>
                  <span className="text-[9px] font-bold text-indigo-600">Base</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  5 Pages • 30 posts/day • Bulk Scheduler
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/40 border border-indigo-200 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-indigo-950">Pro</span>
                  <span className="text-[8px] font-black text-indigo-700 bg-white px-1 rounded border border-indigo-200">
                    POPULAR
                  </span>
                </div>
                <div className="text-[10px] text-indigo-900 leading-tight">
                  15 Pages • 100 posts/day • AI Generator &amp; Insights
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-white space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-white">Agency</span>
                  <span className="text-[8px] font-black text-amber-400 bg-white/10 px-1 rounded">
                    MASTER
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 leading-tight">
                  50 Pages • 500 posts/day • RSS Feeds &amp; Anti-Ban
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== RIGHT COLUMN (lg:col-span-4) Sticky Sidebar ==================== */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
          {/* Card 1: KPI Stats Summary (Tasklify Studio Style) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Platform KPI Overview</span>
              <span className="text-[10px] text-slate-400 font-medium">Real-time</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-0.5">
                <div className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Pending</span>
                </div>
                <div className="text-xl font-black text-slate-900">{pendingUsers.length}</div>
                <div className="text-[9px] text-slate-400">waiting review</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-0.5">
                <div className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  <span>Paid Active</span>
                </div>
                <div className="text-xl font-black text-slate-900">{paidUsersCount}</div>
                <div className="text-[9px] text-slate-400">starter / pro / agency</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-0.5">
                <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Total Users</span>
                </div>
                <div className="text-xl font-black text-slate-900">{totalUsersCount}</div>
                <div className="text-[9px] text-slate-400">all profiles</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-0.5">
                <div className="text-[10px] font-bold text-rose-700 flex items-center gap-1">
                  <Ban className="w-3 h-3" />
                  <span>Suspended</span>
                </div>
                <div className="text-xl font-black text-slate-900">{suspendedUsers.length}</div>
                <div className="text-[9px] text-slate-400">spam blocked</div>
              </div>
            </div>
          </div>

          {/* Card 2: Quick Filter by Status & Tier (Matching Composer Category Quick Select!) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Quick Filter by Status</span>
              </span>
              {(statusFilter !== 'all' || tierFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setTierFilter('all');
                  }}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All Users', count: allUsers.length },
                { id: 'pending', label: 'Pending Review', count: pendingUsers.length, color: 'border-amber-300 bg-amber-50 text-amber-900' },
                { id: 'approved', label: 'Approved', count: approvedUsers.length, color: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
                { id: 'suspended', label: 'Suspended', count: suspendedUsers.length, color: 'border-rose-300 bg-rose-50 text-rose-900' },
              ].map((pill) => {
                const isSel = statusFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() =>
                      setStatusFilter(pill.id as 'all' | 'pending' | 'approved' | 'suspended')
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                      isSel
                        ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                        : pill.color || 'border-[#E2E8F0] bg-[#F8F9FA] text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className="opacity-70 text-[9px]">({pill.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Filter by Tier */}
            <div className="pt-2 border-t border-[#E2E8F0] space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Filter by Plan Tier
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {['all', 'free', 'starter', 'pro', 'agency'].map((t) => {
                  const isSel = tierFilter === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTierFilter(t)}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        isSel
                          ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                          : 'bg-[#F8F9FA] border-[#E2E8F0] text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 3: Admin Actions & System Shortcuts */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Admin Quick Navigation
            </h3>

            <div className="space-y-1.5 text-xs">
              <Link
                href="/settings"
                className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] hover:bg-slate-100 transition-colors text-slate-700 font-bold"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cron &amp; Meta API Settings</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </Link>

              <Link
                href="/composer"
                className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] hover:bg-slate-100 transition-colors text-slate-700 font-bold"
              >
                <div className="flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Open Post Studio</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Subscription Modal (Clean Tasklify Studio Style) */}
      {editingUser && (
        <EditSubscriptionModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onDelete={() => {
            deleteUser(editingUser.id);
            showToast(`User ${editingUser.name} deleted.`);
            setEditingUser(null);
          }}
          onSave={(sub, newStatus) => {
            if (newStatus === 'approved') {
              approveUser(
                editingUser.id,
                sub.tier,
                sub.expiresAt
                  ? Math.max(
                      1,
                      Math.round(
                        (new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      )
                    )
                  : 0,
                sub.maxConnectedPages,
                sub.maxDailyPosts
              );
            } else {
              updateUserSubscription(editingUser.id, sub);
            }
            showToast(`Subscription updated for ${editingUser.name}`);
            setEditingUser(null);
          }}
        />
      )}

      {/* Rejection Prompt Modal */}
      {rejectionTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                <Ban className="w-4 h-4" />
                <span>Decline Registration</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectionTargetUser(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Aap <strong>{rejectionTargetUser.name}</strong> ({rejectionTargetUser.email}) ki registration decline karne ja rahe hain.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Decline Reason (Optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Incomplete details or bot pattern."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRejectionTargetUser(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal Component to Customize Subscription Tier, Expiry & Resource Limits
function EditSubscriptionModal({
  user,
  onClose,
  onSave,
  onDelete,
}: {
  user: User;
  onClose: () => void;
  onSave: (sub: UserSubscription, newStatus: string) => void;
  onDelete?: () => void;
}) {
  const currentSub = user.subscription;

  const [tier, setTier] = useState<SubscriptionTier>(currentSub?.tier || 'pro');
  const [maxPages, setMaxPages] = useState<number>(currentSub?.maxConnectedPages ?? 15);
  const [maxPosts, setMaxPosts] = useState<number>(currentSub?.maxDailyPosts ?? 100);
  const [validityDays, setValidityDays] = useState<number>(
    currentSub?.expiresAt ? 30 : 0 // 0 means Lifetime
  );
  const [canUseAI, setCanUseAI] = useState<boolean>(currentSub?.features?.canUseAI ?? true);
  const [canUseBulk, setCanUseBulk] = useState<boolean>(
    currentSub?.features?.canUseBulkScheduler ?? true
  );
  const [canUseAutomation, setCanUseAutomation] = useState<boolean>(
    currentSub?.features?.canUseAutomationFeed ?? true
  );

  const handleTierChange = (newTier: SubscriptionTier) => {
    setTier(newTier);
    if (newTier === 'free') {
      setMaxPages(2);
      setMaxPosts(10);
      setCanUseAI(false);
      setCanUseBulk(false);
      setCanUseAutomation(false);
    } else if (newTier === 'starter') {
      setMaxPages(5);
      setMaxPosts(30);
      setCanUseAI(true);
      setCanUseBulk(true);
      setCanUseAutomation(false);
    } else if (newTier === 'pro') {
      setMaxPages(15);
      setMaxPosts(100);
      setCanUseAI(true);
      setCanUseBulk(true);
      setCanUseAutomation(true);
    } else if (newTier === 'agency') {
      setMaxPages(50);
      setMaxPosts(500);
      setCanUseAI(true);
      setCanUseBulk(true);
      setCanUseAutomation(true);
    }
  };

  const handleSave = () => {
    const expiresAt =
      validityDays > 0 ? new Date(Date.now() + validityDays * 86400000).toISOString() : null;

    const updatedSub: UserSubscription = {
      tier,
      status: 'active',
      expiresAt,
      maxConnectedPages: Number(maxPages) || 1,
      maxDailyPosts: Number(maxPosts) || 1,
      features: {
        canUseAI,
        canUseBulkScheduler: canUseBulk,
        canUseAutomationFeed: canUseAutomation,
        canUseAnalytics: true,
      },
    };

    onSave(updatedSub, 'approved');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-4 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 tracking-tight">
                Set Plan &amp; Limits: {user.name}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subscription Tier Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700">Choose Subscription Tier</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['free', 'starter', 'pro', 'agency'] as SubscriptionTier[]).map((t) => {
              const active = tier === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTierChange(t)}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold uppercase transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-[#F8F9FA] border-[#E2E8F0] text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Validity Duration */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700">Subscription Validity Duration</label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: '30 Days', days: 30 },
              { label: '90 Days', days: 90 },
              { label: '1 Year', days: 365 },
              { label: 'Lifetime', days: 0 },
            ].map((v) => {
              const active = validityDays === v.days;
              return (
                <button
                  key={v.days}
                  type="button"
                  onClick={() => setValidityDays(v.days)}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-700 border-emerald-700 text-white shadow-xs'
                      : 'bg-[#F8F9FA] border-[#E2E8F0] text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Resource Limits Inputs */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Max Facebook / YT Pages</label>
            <input
              type="number"
              min={1}
              max={200}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Max Daily Posts Limit</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={maxPosts}
              onChange={(e) => setMaxPosts(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>
        </div>

        {/* Feature Switches */}
        <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Enabled Feature Modules
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={canUseAI}
                onChange={(e) => setCanUseAI(e.target.checked)}
                className="rounded border-[#CBD5E1] text-slate-900 focus:ring-0"
              />
              <span className="font-semibold text-slate-800 text-[11px]">AI Generator</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={canUseBulk}
                onChange={(e) => setCanUseBulk(e.target.checked)}
                className="rounded border-[#CBD5E1] text-slate-900 focus:ring-0"
              />
              <span className="font-semibold text-slate-800 text-[11px]">Bulk Scheduler</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={canUseAutomation}
                onChange={(e) => setCanUseAutomation(e.target.checked)}
                className="rounded border-[#CBD5E1] text-slate-900 focus:ring-0"
              />
              <span className="font-semibold text-slate-800 text-[11px]">RSS Feeds</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2.5 border-t border-[#E2E8F0] flex items-center justify-between">
          {user.email?.toLowerCase().trim() !== 'suzaldhiman@gmail.com' ? (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Kya aap ${user.name} (${user.email}) ka account completely delete/remove karna chahte hain?`)) {
                  onDelete?.();
                }
              }}
              className="py-1.5 px-3 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove User</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-3 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="py-1.5 px-4 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save &amp; Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
