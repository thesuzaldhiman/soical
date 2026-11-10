'use client';

import React from 'react';
import { AppProvider } from '@/lib/context/app-context';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </AppProvider>
  );
}
