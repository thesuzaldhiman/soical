'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm font-semibold text-slate-600">Redirecting to Dashboard...</p>
    </div>
  );
}
