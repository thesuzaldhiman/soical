'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { ReelStudioTab } from '@/components/image-generator/ReelStudioTab';
import {
  Film,
  Sparkles,
  ArrowRight,
  Layers,
  Globe,
  Palette,
  CheckCircle2,
  Tv,
  Share2,
} from 'lucide-react';

export default function ReelStudioPage() {
  const { sigTemplates, saveSigTemplate } = useApp();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    sigTemplates[0]?.id || 'tmpl_reel_9x16'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sample default headline and photo for live preview
  const sampleHeadline =
    'सुक्खू सरकार का बड़ा फैसला : हिमकेयर बंद, अब मिलेगा ₹10 लाख तक फ्री इलाज!';
  const samplePhotoUrl =
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1080&h=1920&fit=crop&q=80';

  return (
    <AppShell>
      <div className="space-y-6 font-sans max-w-6xl pb-20 select-none animate-fade-in">
        {/* ── Top Header ── */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Viral 9:16 Video Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Reel &amp; Video Motion Studio</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Transform news cards into dynamic 9:16 Video Reels with camera shake, glitter/sparkle animations, and trimmed background music. Fully automated for Facebook Reels, Instagram &amp; YouTube Shorts.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2.5 shrink-0 flex-wrap">
            <Link
              href="/automations"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15"
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Website Rules</span>
            </Link>

            <Link
              href="/image-generator"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md"
            >
              <Palette className="w-4 h-4" />
              <span>Edit PNG Frames</span>
            </Link>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2.5 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Reel settings saved successfully! WordPress articles matching this template will now auto-generate this exact video reel!
            </span>
          </div>
        )}

        {/* ── Main Reel Studio Interactive Workspace ── */}
        <div className="bg-[#F8F9FD] p-1 rounded-3xl border border-[#EEF1F6]">
          <ReelStudioTab
            sigTemplates={sigTemplates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={(id) => setSelectedTemplateId(id)}
            onSaveTemplate={(updatedTmpl) => {
              saveSigTemplate(updatedTmpl);
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 3000);
            }}
            sampleHeadline={sampleHeadline}
            sampleImageUrl={samplePhotoUrl}
          />
        </div>

        {/* ── How Zero-Touch Reel Automation Works ── */}
        <div className="p-6 rounded-3xl bg-white border border-[#EEF1F6] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Tv className="w-4 h-4 text-rose-600" />
                <span>How Automated Category-to-Reels Publishing Works</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Zero manual work required. Set up your rule once, and let the engine auto-publish every article.
              </p>
            </div>
            <Link
              href="/automations"
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <span>Setup in Automations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                1
              </div>
              <h4 className="font-extrabold text-xs text-slate-900">Map Category &amp; Template</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Connect your WordPress Category (e.g. <em>Bhakti</em> or <em>Crime</em>) to a specific 9:16 template.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-black text-xs">
                2
              </div>
              <h4 className="font-extrabold text-xs text-slate-900">Configure Motion &amp; Beat</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Select Camera Shake or Glitter and set duration (10s/15s) with auto-trimmed background music.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                3
              </div>
              <h4 className="font-extrabold text-xs text-slate-900">Choose Target Channels</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Pick destination Facebook Pages, Instagram accounts, or YouTube channel for direct Shorts posting.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                4
              </div>
              <h4 className="font-extrabold text-xs text-slate-900">Zero-Touch Auto Publish</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Editor publishes post on WordPress ➔ Reel renders in 2s ➔ Auto-posted to Reels feeds!
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
