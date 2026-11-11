'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  Users,
  Clock,
  CheckCircle2,
  Search,
  Ban,
  Trash2,
  Zap,
  Crown,
  Eye,
  X,
  Sliders,
  Shield,
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

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'suspended'>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [rejectionTargetUser, setRejectionTargetUser] = useState<User | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    return matchesSearch && matchesStatus;
  });

  const handleQuickApprove = (userId: string, tier: SubscriptionTier = 'pro') => {
    approveUser(userId, tier, 30);
    showToast('User account approved successfully!');
  };

  const handleConfirmReject = () => {
    if (!rejectionTargetUser) return;
    rejectUser(rejectionTargetUser.id, rejectionReason || 'Registration declined by administrator.');
    setRejectionTargetUser(null);
    setRejectionReason('');
    showToast('User registration rejected.');
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto animate-fade-in font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-lg flex items-center gap-2 border border-slate-800 animate-slide-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card (Compact Modern Studio) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Admin SaaS Management Console
            </h1>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-[#E2E8F0]">
              Master
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium line-clamp-1">
            Review incoming user signups, approve accounts, customize subscription tiers, and control access limits.
          </p>
        </div>

        {/* Current Active User Indicator */}
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt={currentUser.name}
            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200"
          />
          <div className="text-left">
            <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>{currentUser.name}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                ADMIN
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
              {currentUser.email}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Approvals */}
        <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-2 relative overflow-hidden">
          {pendingUsers.length > 0 && (
            <div className="absolute top-4 right-4">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
            <Clock className="w-4 h-4" />
            <span>Pending Approvals</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{pendingUsers.length}</div>
          <p className="text-[11px] text-slate-400">
            {pendingUsers.length === 0 ? 'No waiting signups' : 'Users waiting for your review'}
          </p>
        </div>

        {/* Total Users */}
        <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Users className="w-4 h-4 text-slate-400" />
            <span>Total Registered</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{totalUsersCount}</div>
          <p className="text-[11px] text-slate-400">All registered tenant profiles</p>
        </div>

        {/* Active Subscribed Users */}
        <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
            <Crown className="w-4 h-4" />
            <span>Active Paid Subscriptions</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{paidUsersCount}</div>
          <p className="text-[11px] text-slate-400">Starter, Pro & Agency tiers</p>
        </div>

        {/* Suspended Accounts */}
        <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-600">
            <Ban className="w-4 h-4" />
            <span>Suspended Accounts</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{suspendedUsers.length}</div>
          <p className="text-[11px] text-slate-400">Policy violations or spam blocked</p>
        </div>
      </div>

      {/* Priority Section: Pending Approvals Queue */}
      {pendingUsers.length > 0 && (
        <div className="p-6 rounded-3xl bg-amber-50/50 border border-amber-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">
                  Needs Your Approval ({pendingUsers.length})
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Ye users signup kar chuke hain. Inhe approve karein aur subscription tier assign karein:
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-full border border-amber-200">
              High Priority
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {pendingUsers.map((pUser) => (
              <div
                key={pUser.id}
                className="p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-3.5 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={pUser.name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-900 truncate">
                        {pUser.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-medium">
                        {pUser.email}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                          Requested: {pUser.subscription?.tier || 'Starter'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {pUser.createdAt ? new Date(pUser.createdAt).toLocaleDateString() : 'Today'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(pUser)}
                    className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8F9FA] text-slate-700 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    <span>Customize & Approve</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRejectionTargetUser(pUser)}
                      className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickApprove(pUser.id, pUser.subscription?.tier || 'pro')}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>1-Click Approve</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main All Users Table Card */}
      <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-5">
        {/* Table Controls (Search & Filter) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              All Users & Subscriptions
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Manage accounts, set subscription limits, toggle suspensions, and preview user sessions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 p-1 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                All ({allUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-amber-100 text-amber-900 shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Pending ({pendingUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-100 text-emerald-900 shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Approved ({approvedUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('suspended')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  statusFilter === 'suspended'
                    ? 'bg-rose-100 text-rose-900 shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Suspended ({suspendedUsers.length})
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="pb-3 pl-2">User Details</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Subscription Tier</th>
                <th className="pb-3">Resource Limits</th>
                <th className="pb-3">Validity</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const sub = u.subscription;
                  const isOwner = u.role === 'owner';
                  const isCurrent = currentUser.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-[#F8F9FA]/60 transition-colors">
                      {/* User */}
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={u.name}
                            className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] font-black px-1 rounded bg-slate-900 text-white">
                                  YOU
                                </span>
                              )}
                              {isOwner && (
                                <span className="text-[9px] font-black px-1 rounded bg-amber-100 text-amber-900">
                                  OWNER
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Approval Status */}
                      <td className="py-3">
                        {u.approvalStatus === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Approved</span>
                          </span>
                        ) : u.approvalStatus === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Review</span>
                          </span>
                        ) : u.approvalStatus === 'suspended' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-200">
                            <Ban className="w-3 h-3 text-rose-600" />
                            <span>Suspended</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black">
                            {u.approvalStatus || 'Approved'}
                          </span>
                        )}
                      </td>

                      {/* Subscription Tier */}
                      <td className="py-3">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-[#E2E8F0] font-bold text-slate-900 uppercase tracking-tight text-[11px]">
                          <Crown className="w-3 h-3 text-amber-600" />
                          <span>{sub?.tier || 'Pro'}</span>
                        </div>
                      </td>

                      {/* Resource Limits */}
                      <td className="py-3">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="font-bold text-slate-700">
                            {sub?.maxConnectedPages ?? 15} Pages limit
                          </div>
                          <div className="text-slate-400 font-medium">
                            {sub?.maxDailyPosts ?? 100} posts/day
                          </div>
                        </div>
                      </td>

                      {/* Validity */}
                      <td className="py-3">
                        <div className="text-[11px]">
                          {sub?.expiresAt ? (
                            <div className="font-bold text-slate-800">
                              {new Date(sub.expiresAt).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Lifetime / Unlimited
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 pr-2 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Customize Subscription button */}
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8F9FA] text-slate-700 hover:text-slate-900 transition-colors"
                            title="Edit Plan, Expiry & Limits"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Switch to this user account (Demo testing) */}
                          <button
                            type="button"
                            onClick={() => {
                              switchActiveUser(u.id);
                              showToast(`Switched active view to ${u.name}`);
                            }}
                            className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition-colors"
                            title="Preview portal as this user"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Suspend / Unsuspend */}
                          {!isOwner && (
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
                              className={`p-1.5 rounded-lg border transition-colors ${
                                u.approvalStatus === 'suspended'
                                  ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                  : 'border-[#E2E8F0] text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                              }`}
                              title={u.approvalStatus === 'suspended' ? 'Unsuspend' : 'Suspend'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${u.name}?`)) {
                                  deleteUser(u.id);
                                  showToast('User deleted.');
                                }
                              }}
                              className="p-1.5 rounded-lg border border-[#E2E8F0] text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                              title="Delete user"
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

      {/* Subscription Plans Reference Tier Card */}
      <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Subscription Tiers & Default Limits Architecture
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Configurable per tenant</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-slate-900">Free Tier</span>
              <span className="text-[10px] font-bold text-slate-500">₹0 / mo</span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-1">
              <li>• Max 2 Facebook / YT Channels</li>
              <li>• 10 Posts / day</li>
              <li>• Manual Composer only</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-slate-900">Starter Tier</span>
              <span className="text-[10px] font-bold text-indigo-600">Standard</span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-1">
              <li>• Max 5 Connected Pages</li>
              <li>• 30 Posts / day</li>
              <li>• Bulk Scheduler Included</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-indigo-950">Pro Tier</span>
              <span className="text-[10px] font-extrabold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                Recommended
              </span>
            </div>
            <ul className="text-[11px] text-indigo-900 space-y-1">
              <li>• Max 15 Connected Pages</li>
              <li>• 100 Posts / day</li>
              <li>• AI Caption & Image Generator</li>
              <li>• Analytics & Monetization 100P</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black">Agency / Unlimited</span>
              <span className="text-[10px] font-extrabold text-amber-400 bg-white/10 px-1.5 py-0.5 rounded">
                Master
              </span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1">
              <li>• 50+ Pages & Multi-Channel</li>
              <li>• 500+ Posts / day</li>
              <li>• Blogger RSS Feed Automation</li>
              <li>• Zero-Width Anti-Ban Engine</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Edit Subscription Modal */}
      {editingUser && (
        <EditSubscriptionModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
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
          <div className="bg-white rounded-3xl border border-[#E2E8F0] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                <Ban className="w-4 h-4" />
                <span>Decline Registration</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectionTargetUser(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Aap <strong>{rejectionTargetUser.name}</strong> ({rejectionTargetUser.email}) ki registration reject karne ja rahe hain.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Reason (Optional)</label>
              <textarea
                rows={3}
                placeholder="e.g. Incomplete domain details or spam account."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectionTargetUser(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
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
}: {
  user: User;
  onClose: () => void;
  onSave: (sub: UserSubscription, newStatus: string) => void;
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
      <div className="bg-white rounded-3xl border border-[#E2E8F0] max-w-lg w-full p-6 sm:p-7 shadow-xl space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Set Plan & Limits: {user.name}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subscription Tier Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Choose Subscription Tier</label>
          <div className="grid grid-cols-4 gap-2">
            {(['free', 'starter', 'pro', 'agency'] as SubscriptionTier[]).map((t) => {
              const active = tier === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTierChange(t)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold uppercase transition-all ${
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
          <label className="text-xs font-bold text-slate-700">Subscription Validity</label>
          <div className="grid grid-cols-4 gap-2">
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
                  className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all ${
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
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Max Facebook / YT Pages</label>
            <input
              type="number"
              min={1}
              max={200}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Max Daily Posts Limit</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={maxPosts}
              onChange={(e) => setMaxPosts(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
        </div>

        {/* Feature Switches */}
        <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Enabled SaaS Modules
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={canUseAI}
                onChange={(e) => setCanUseAI(e.target.checked)}
                className="rounded border-[#CBD5E1] text-slate-900 focus:ring-0"
              />
              <span className="font-semibold text-slate-800 text-[11px]">AI Generator</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={canUseBulk}
                onChange={(e) => setCanUseBulk(e.target.checked)}
                className="rounded border-[#CBD5E1] text-slate-900 focus:ring-0"
              />
              <span className="font-semibold text-slate-800 text-[11px]">Bulk Scheduler</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={canUseAutomation}
                onChange={(e) => setCanUseAutomation(e.target.checked)}
                className="rounded border-[#CBD5E1] text-slate-900 focus:ring-0"
              />
              <span className="font-semibold text-slate-800 text-[11px]">Blogger RSS Feed</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-bold text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-transform active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save & Approve User</span>
          </button>
        </div>
      </div>
    </div>
  );
}
