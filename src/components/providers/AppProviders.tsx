'use client';

import React from 'react';
import { AppProvider } from '@/lib/context/app-context';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
