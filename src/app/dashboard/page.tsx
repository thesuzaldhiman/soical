'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { Platform } from '@/types';
import {
  Users2,
  Clock,
  CheckCircle2,
  Share2,
  Plus,
  ChevronRight,
  ExternalLink,
  Calendar,
  MessageSquare,
  Play,
  RotateCw,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { user, workspace, accounts, pages, posts, retryPost } = useApp();

  // Actual live application data calculations (no hardcoded statistics!)
  const totalAccounts = accounts.length;
  const totalPages = pages.length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;

  const supportedPlatforms: {
    id: Platform;
    name: string;
    icon: string;
    description: string;
  }[] = [
    {
      id: 'facebook' as Platform,
      name: 'Facebook',
      icon: '📘',
      description: 'Facebook Pages & Content Publishing',
    },
    {
      id: 'instagram' as Platform,
      name: 'Instagram',
      icon: '📸',
      description: 'Instagram Business / Creator Accounts',
    },
    {
      id: 'youtube' as Platform,
      name: 'YouTube',
      icon: '▶️',
      description: 'YouTube Shorts & Video Channels',
    },
    {
      id: 'threads' as Platform,
      name: 'Threads',
      icon: '🧵',
      description: 'Meta Threads Profiles',
    },
    {
      id: 'telegram' as Platform,
      name: 'Telegram',
      icon: '✈️',
      description: 'Telegram Channels & Bot Broadcasts',
    },
  ];

  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📸',
    threads: '🧵',
    telegram: '✈️',
    youtube: '▶️',
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* 1. Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EBEBE8]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome Back, {user.name.split(' ')[0]}..!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Workspace: <strong className="text-slate-800">{workspace.name}</strong> • Monitor your channels and track publishing activity.
          </p>
        </div>

        <Link
          href="/composer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Post</span>
        </Link>
      </div>

      {/* 2. Overview Cards (4 essential stats from actual state) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Connected Accounts */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4 stroke-[2]" />
            </div>
            <Link
              href="/accounts"
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-800 flex items-center gap-0.5 transition-colors"
            >
              <span>View Details</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalAccounts}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Total Connected Accounts
            </div>
          </div>
        </div>

        {/* Total Connected Pages / Channels */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
              <Users2 className="w-4 h-4 stroke-[2]" />
            </div>
            <Link
              href="/accounts"
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-800 flex items-center gap-0.5 transition-colors"
            >
              <span>View Details</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalPages}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Total Pages / Channels
            </div>
          </div>
        </div>

        {/* Published Posts */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Delivered
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {publishedCount}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Published Posts
            </div>
          </div>
        </div>

        {/* Scheduled Posts */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Queued
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {scheduledCount}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Scheduled Posts
            </div>
          </div>
        </div>
      </div>

      {/* 3. Connected Accounts Overview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Connected Platforms</h2>
            <p className="text-xs text-slate-500">
              Overview of social platforms and active publishing destinations.
            </p>
          </div>
          <Link
            href="/accounts"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <span>Manage All Accounts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {supportedPlatforms.map((plat) => {
            const platformPages = pages.filter((p) => p.platform === plat.id);
            const isConnected = platformPages.length > 0;

            return (
              <div
                key={plat.id}
                className="bg-white rounded-2xl border border-[#E8E8E4] p-4.5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{plat.icon}</span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">
                        {plat.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {isConnected
                          ? plat.id === 'facebook'
                            ? `${platformPages.length} Pages`
                            : `${platformPages.length} Channel`
                          : 'Not connected'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#F2F2EE]">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isConnected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConnected ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {isConnected ? 'Connected' : 'Offline'}
                  </span>

                  <Link
                    href={`/accounts?platform=${plat.id}`}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 transition-colors"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Posts Section */}
      <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#F2F2EE]">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Posts</h2>
            <p className="text-xs text-slate-500">
              List of recently published and upcoming scheduled posts.
            </p>
          </div>
          <Link
            href="/composer"
            className="text-xs font-bold text-slate-800 hover:text-blue-600 flex items-center gap-1"
          >
            <span>+ Create New</span>
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="py-12 text-center">
            <Share2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No posts created yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Start publishing across Facebook Pages, Instagram, YouTube Shorts, and Telegram in one click.
            </p>
            <Link
              href="/composer"
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Your First Post</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#F2F2EE]">
            {posts.slice(0, 6).map((post) => {
              const statusBadges = {
                published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
                failed: 'bg-rose-50 text-rose-700 border-rose-200',
                partial: 'bg-amber-50 text-amber-700 border-amber-200',
                draft: 'bg-slate-100 text-slate-700 border-slate-200',
                publishing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
              };

              return (
                <div
                  key={post.id}
                  className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Media Thumbnail */}
                    {post.mediaUrl ? (
                      <div className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.mediaUrl}
                          alt="thumbnail"
                          className="w-13 h-13 rounded-xl object-cover border border-[#E8E8E4]"
                        />
                        {post.postType === 'video' && (
                          <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center text-white">
                            <Play className="w-4 h-4 fill-white" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-13 h-13 rounded-xl bg-[#F6F6F3] border border-[#E8E8E4] flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase shrink-0">
                        {post.postType}
                      </div>
                    )}

                    {/* Content Snippet & Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            statusBadges[post.status]
                          }`}
                        >
                          {post.status}
                        </span>

                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {post.publishedAt
                            ? `Published on ${new Date(post.publishedAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : post.scheduledAt
                            ? `Scheduled for ${new Date(post.scheduledAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : 'Draft'}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-900 leading-snug line-clamp-1">
                        {post.message}
                      </p>

                      {/* Destination Channels Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {post.pageIds.map((pid) => {
                          const pg = pages.find((p) => p.id === pid);
                          if (!pg) return null;
                          return (
                            <span
                              key={pid}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F6F6F3] border border-[#EBEBE8] text-[10px] font-medium text-slate-700"
                              title={pg.name}
                            >
                              <span>{platformIcons[pg.platform] || '📢'}</span>
                              <span className="truncate max-w-[120px]">{pg.name}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {post.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => retryPost(post.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1 transition-all"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    )}
                    <Link
                      href={`/composer?clone=${post.id}`}
                      className="px-3 py-1.5 rounded-xl border border-[#E8E8E4] bg-white hover:bg-[#FAF9F6] text-slate-700 text-xs font-semibold shadow-2xs transition-all"
                    >
                      Reschedule
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
