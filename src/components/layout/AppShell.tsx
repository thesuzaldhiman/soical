'use client';

import React from 'react';
import { AppProvider } from '@/lib/context/app-context';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-screen flex bg-[#F8F8F6] text-[#141413] font-sans antialiased">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-6 sm:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
        </div>
      </div>
    </AppProvider>
  );
}
