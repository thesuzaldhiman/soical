'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import {
  Palette,
  Sparkles,
  Download,
  Send,
  Sliders,
  Type,
  ImageIcon,
  Layout,
  CheckCircle2,
  Highlighter,
} from 'lucide-react';

export default function ImageGeneratorPage() {
  return (
    <AppShell>
      <ImageGeneratorContent />
    </AppShell>
  );
}

function ImageGeneratorContent() {
  const router = useRouter();
  const { sigTemplates, saveSigTemplate } = useApp();

  // Template selector
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(sigTemplates[0]?.id || 'tmpl_1');
  const activeTemplate = sigTemplates.find((t) => t.id === selectedTemplateId) || sigTemplates[0];

  // Editor fields
  const [headline, setHeadline] = useState(
    'रोजी-रोटी कमाने गया था पति, पीछे से पत्नी ने उठाया ये खौफनाक कदम'
  );
  const [highlightPhrase, setHighlightPhrase] = useState('रोजी-रोटी कमाने गया था पति,');
  const [highlightColor, setHighlightColor] = useState('#FBBF24');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fontSize, setFontSize] = useState(activeTemplate?.titleBox?.fontSize || 46);
  const [bgImageUrl, setBgImageUrl] = useState(
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&h=630&fit=crop&q=80'
  );
  const [fontFamily, setFontFamily] = useState('Noto Sans Devanagari');
  const [downloading, setDownloading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render to canvas whenever controls change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = activeTemplate.canvasWidth;
    const height = activeTemplate.canvasHeight;
    canvas.width = width;
    canvas.height = height;

    // Load background image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = bgImageUrl;

    img.onload = () => {
      // Draw background cover
      ctx.drawImage(img, 0, 0, width, height);

      // Dark gradient overlay for text readability
      const gradient = ctx.createLinearGradient(0, height * 0.35, 0, height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.7)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Top Red News Tag Badge
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.roundRect(40, height * 0.45, 140, 36, 6);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('BREAKING NEWS', 50, height * 0.45 + 24);

      // Render Title with Dual-color highlight
      renderHeadlineText(ctx, width, height);
    };

    img.onerror = () => {
      // Fallback dark gradient background if image load fails
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, 0, width, height);
      renderHeadlineText(ctx, width, height);
    };
  }, [headline, highlightPhrase, highlightColor, textColor, fontSize, bgImageUrl, fontFamily, activeTemplate]);

  // Helper to draw wrapped text with dual color highlight
  const renderHeadlineText = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const startX = 40;
    const startY = height * 0.58;
    const maxWidth = width - 80;
    const lineHeight = fontSize * 1.35;

    ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;

    const words = headline.split(' ');
    let line = '';
    const lines: string[] = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    // Draw each line
    let currentY = startY;
    lines.forEach((currentLine) => {
      // Check if this line contains any part of the highlight phrase
      if (highlightPhrase && currentLine.includes(highlightPhrase.trim())) {
        const parts = currentLine.split(highlightPhrase.trim());
        let x = startX;

        // Prefix
        if (parts[0]) {
          ctx.fillStyle = textColor;
          ctx.fillText(parts[0], x, currentY);
          x += ctx.measureText(parts[0]).width;
        }

        // Highlight
        ctx.fillStyle = highlightColor;
        ctx.fillText(highlightPhrase.trim(), x, currentY);
        x += ctx.measureText(highlightPhrase.trim()).width;

        // Suffix
        if (parts[1]) {
          ctx.fillStyle = textColor;
          ctx.fillText(parts[1], x, currentY);
        }
      } else {
        ctx.fillStyle = textColor;
        ctx.fillText(currentLine, startX, currentY);
      }
      currentY += lineHeight;
    });

    // Bottom Branding Footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('⚡ KHABAR MONKEY MEDIA NETWORK', 40, height - 30);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `social-card-${Date.now()}.png`;
    a.click();
    setTimeout(() => setDownloading(false), 600);
  };

  const handleSendToComposer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    // Save to localStorage temporary buffer
    sessionStorage.setItem('sap_sig_pending_image', dataUrl);
    sessionStorage.setItem('sap_sig_pending_caption', headline);
    router.push('/composer');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Palette className="w-6 h-6 text-violet-600" />
            <span>Social Image Generator (SIG)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Generate high-CTR Hindi news cards with pixel-perfect Devanagari text & dual-color highlights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Exporting...' : 'Download PNG'}</span>
          </button>
          <button
            type="button"
            onClick={handleSendToComposer}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
          >
            <Send className="w-4 h-4" />
            <span>Send to Post Composer</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Template Choice */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Layout className="w-4 h-4" />
              <span>Canvas Format / Template</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {sigTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    selectedTemplateId === t.id
                      ? 'border-violet-600 bg-violet-50/50 text-violet-900 font-bold shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold">{t.name.split('(')[0]}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {t.canvasWidth} × {t.canvasHeight} px
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Hindi Title & Highlight Phrase */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Type className="w-4 h-4" />
                <span>Headline (Hindi / Devanagari)</span>
              </div>
              <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                HarfBuzz Compatible
              </span>
            </div>

            <textarea
              rows={3}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />

            {/* Dual Color Highlight Phrase */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Highlighter className="w-4 h-4 text-amber-500" />
                <span>Dual-Color Highlight Phrase</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Any phrase you type here will appear in the custom highlight color on the final card.
              </p>
              <input
                type="text"
                value={highlightPhrase}
                onChange={(e) => setHighlightPhrase(e.target.value)}
                placeholder="e.g. रोजी-रोटी कमाने गया था पति,"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                  Highlight Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={highlightColor}
                    onChange={(e) => setHighlightColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0"
                  />
                  <span className="text-xs font-mono font-medium text-slate-600">
                    {highlightColor}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                  Main Text Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0"
                  />
                  <span className="text-xs font-mono font-medium text-slate-600">
                    {textColor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Typography & Background Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Sliders className="w-4 h-4" />
              <span>Typography & Background</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Font Size ({fontSize}px)
                </label>
                <input
                  type="range"
                  min="24"
                  max="64"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Font Family
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-slate-50 font-medium"
                >
                  <option value="Noto Sans Devanagari">Noto Sans Devanagari</option>
                  <option value="Arial">Arial / System</option>
                  <option value="Georgia">Georgia Serif</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Background Photo URL
              </label>
              <input
                type="url"
                value={bgImageUrl}
                onChange={(e) => setBgImageUrl(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Canvas Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900">Live Render Canvas</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {activeTemplate.canvasWidth} × {activeTemplate.canvasHeight}
              </span>
            </div>

            {/* Canvas Container */}
            <div className="w-full bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center p-2 border border-slate-800">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded-lg shadow-2xl"
                style={{ maxHeight: '520px' }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 mt-4 px-1">
              <span>Ready for Facebook Feed & Instagram Story</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Auto 100% Crisp DPI
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
