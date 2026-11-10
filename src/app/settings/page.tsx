'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Building2,
  Sliders,
  CheckCircle2,
  Save,
  Bell,
  ShieldCheck,
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}

function SettingsContent() {
  const { user, workspace, updateUser, updateWorkspace } = useApp();

  // User Profile fields
  const [userName, setUserName] = useState(user.name);
  const [userEmail, setUserEmail] = useState(user.email);
  const [userAvatar, setUserAvatar] = useState(user.avatar);

  // Workspace Profile fields
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [workspaceSlug, setWorkspaceSlug] = useState(workspace.slug);

  // Account Preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [defaultIntervalSec, setDefaultIntervalSec] = useState(45);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();

    updateUser({
      name: userName.trim(),
      email: userEmail.trim(),
      avatar: userAvatar.trim(),
    });

    updateWorkspace({
      name: workspaceName.trim(),
      slug: workspaceSlug.trim(),
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-8 font-sans max-w-4xl animate-fade-in">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EBEBE8]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Manage your user profile, workspace preferences, and publishing defaults.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Changes saved successfully</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* 1. User Profile Card */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0F0ED]">
            <UserIcon className="w-4 h-4 text-slate-700 stroke-[2.2]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              User Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E8E8E4] text-xs text-slate-900 bg-[#FAF9F6] focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E8E8E4] text-xs text-slate-900 bg-[#FAF9F6] focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Avatar Image URL
            </label>
            <input
              type="url"
              value={userAvatar}
              onChange={(e) => setUserAvatar(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#E8E8E4] text-xs text-slate-900 bg-[#FAF9F6] focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            />
          </div>
        </div>

        {/* 2. Workspace Profile Card */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0F0ED]">
            <Building2 className="w-4 h-4 text-slate-700 stroke-[2.2]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Workspace Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Workspace Name
              </label>
              <input
                type="text"
                required
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E8E8E4] text-xs text-slate-900 bg-[#FAF9F6] focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Workspace URL Slug
              </label>
              <input
                type="text"
                required
                value={workspaceSlug}
                onChange={(e) => setWorkspaceSlug(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E8E8E4] text-xs text-slate-900 bg-[#FAF9F6] focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EEEEEC] flex items-center justify-between text-xs text-slate-600">
            <span>Current Subscription Plan:</span>
            <span className="font-bold text-slate-900 uppercase px-2 py-0.5 rounded bg-white border border-[#E0E0DC]">
              {workspace.plan} Plan
            </span>
          </div>
        </div>

        {/* 3. Account Preferences Card */}
        <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0F0ED]">
            <Sliders className="w-4 h-4 text-slate-700 stroke-[2.2]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Account & Publishing Preferences
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Email Notifications for Failed Dispatches
                </span>
                <span className="text-[11px] text-slate-400">
                  Receive an instant alert if an account token expires or an API request fails.
                </span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 text-slate-900 rounded cursor-pointer"
              />
            </div>

            <div className="pt-3 border-t border-[#F2F2EE] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Default Multi-Page Dispatch Delay
                </span>
                <span className="text-[11px] text-slate-400">
                  Recommended: 30 to 60 seconds between Facebook Pages to avoid rate limits.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={defaultIntervalSec}
                  onChange={(e) => setDefaultIntervalSec(Number(e.target.value))}
                  className="w-16 p-2 rounded-lg border border-[#E8E8E4] text-xs font-bold text-slate-900 text-center bg-[#FAF9F6]"
                />
                <span className="text-xs text-slate-500">sec</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
