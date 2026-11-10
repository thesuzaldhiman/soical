'use client';

import React from 'react';
import { AppProvider } from '@/lib/context/app-context';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-screen flex bg-[#F8F9FD] text-[#0F172A] font-sans antialiased">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-5 sm:p-7 max-w-[1500px] w-full mx-auto">{children}</main>
        </div>
      </div>
    </AppProvider>
  );
}
