import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Inter, Geist_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: '--font-devanagari',
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Social Auto Poster Pro – Multi-Platform Publishing & Image Suite',
  description:
    'SaaS platform for publishing, scheduling & generating Hindi social cards across Facebook, Instagram, Threads, Telegram, and YouTube Shorts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${inter.variable} ${geistMono.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans selection:bg-slate-900 selection:text-white">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
