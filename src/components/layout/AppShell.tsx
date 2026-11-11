'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context/app-context';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { ApprovalGate } from '@/components/auth/ApprovalGate';
import { Loader2 } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // While checking hydration / session, show clean Tasklify loader
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] text-slate-600 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
        <span className="text-xs font-semibold text-slate-400">Loading workspace session...</span>
      </div>
    );
  }

  // If unauthenticated, hold render until redirect finishes
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] text-slate-600 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
        <span className="text-xs font-semibold text-slate-400">Redirecting to sign in...</span>
      </div>
    );
  }

  return (
    <ApprovalGate>
      <div className="min-h-screen flex bg-[#F8F9FD] text-[#0F172A] font-sans antialiased">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-4 sm:p-5 max-w-[1500px] w-full mx-auto">{children}</main>
        </div>
      </div>
    </ApprovalGate>
  );
}
