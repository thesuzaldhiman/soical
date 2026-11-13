'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { SigTemplate } from '@/types';
import { renderTemplateToCanvas } from '@/lib/services/image-compositor';
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
  Plus,
  Trash2,
  Edit3,
  Eye,
  Check,
  Move,
  Maximize2,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function ImageGeneratorPage() {
  return (
    <AppShell>
      <SocialImageGeneratorContent />
    </AppShell>
  );
}

function SocialImageGeneratorContent() {
  const router = useRouter();
  const { sigTemplates, saveSigTemplate, createPost } = useApp();

  // Active top-level tab: 'templates' | 'editor' | 'generator'
  const [activeTab, setActiveTab] = useState<'templates' | 'editor' | 'generator'>('templates');

  // Currently loaded template for editing
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    sigTemplates[0]?.id || 'tmpl_1'
  );
  const activeTemplate =
    sigTemplates.find((t) => t.id === selectedTemplateId) || sigTemplates[0] || {
      id: 'tmpl_default',
      name: 'Default 1200x630 Template',
      canvasWidth: 1200,
      canvasHeight: 630,
      templateImageUrl:
        'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&h=630&fit=crop&q=80',
      featuredImageBox: { x: 40, y: 40, width: 1120, height: 380, borderRadius: 12 },
      titleBox: {
        x: 40,
        y: 450,
        width: 1120,
        height: 150,
        fontSize: 44,
        lineHeight: 1.35,
        textColor: '#FFFFFF',
        highlightColor: '#FBBF24',
        fontFamily: 'Noto Sans Devanagari',
        alignment: 'left',
      },
      isDefault: true,
    };

  // ── Template Editor State ──
  const [templateName, setTemplateName] = useState(activeTemplate.name);
  const [canvasWidth, setCanvasWidth] = useState(activeTemplate.canvasWidth);
  const [canvasHeight, setCanvasHeight] = useState(activeTemplate.canvasHeight);
  const [templateImageUrl, setTemplateImageUrl] = useState(activeTemplate.templateImageUrl);

  // Boxes
  const [fBox, setFBox] = useState(
    activeTemplate.featuredImageBox || { x: 40, y: 40, width: 1120, height: 380, borderRadius: 12 }
  );
  const [tBox, setTBox] = useState(
    activeTemplate.titleBox || {
      x: 40,
      y: 450,
      width: 1120,
      height: 150,
      fontSize: 44,
      lineHeight: 1.35,
      textColor: '#FFFFFF',
      highlightColor: '#FBBF24',
      fontFamily: 'Noto Sans Devanagari',
      alignment: 'left',
    }
  );

  // Selected box in visual editor: 'featured' | 'title'
  const [activeBox, setActiveBox] = useState<'featured' | 'title'>('featured');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Single Card Generator State ──
  const [genHeadline, setGenHeadline] = useState(
    'शिमला और मनाली में सीजन की भारी बर्फबारी, पर्यटकों का लगा भारी हुजूम'
  );
  const [genHighlight, setGenHighlight] = useState('भारी बर्फबारी,');
  const [genPhotoUrl, setGenPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&h=630&fit=crop&q=80'
  );
  const [generatedDataUrl, setGeneratedDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // ── New Template Modal State ──
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplWidth, setNewTmplWidth] = useState(1200);
  const [newTmplHeight, setNewTmplHeight] = useState(630);
  const [newTmplImageUrl, setNewTmplImageUrl] = useState('');
  const [newTmplIsDefault, setNewTmplIsDefault] = useState(false);

  // Canvas Refs
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualEditorContainerRef = useRef<HTMLDivElement | null>(null);

  // Synchronize local states when switching selected template
  useEffect(() => {
    if (activeTemplate) {
      setTemplateName(activeTemplate.name);
      setCanvasWidth(activeTemplate.canvasWidth);
      setCanvasHeight(activeTemplate.canvasHeight);
      setTemplateImageUrl(activeTemplate.templateImageUrl);
      setFBox(activeTemplate.featuredImageBox || { x: 40, y: 40, width: 1120, height: 380, borderRadius: 12 });
      setTBox(
        activeTemplate.titleBox || {
          x: 40,
          y: 450,
          width: 1120,
          height: 150,
          fontSize: 44,
          lineHeight: 1.35,
          textColor: '#FFFFFF',
          highlightColor: '#FBBF24',
          fontFamily: 'Noto Sans Devanagari',
          alignment: 'left',
        }
      );
    }
  }, [selectedTemplateId, activeTemplate]);

  // Live render generator preview
  const handleRenderPreview = useCallback(async () => {
    if (!previewCanvasRef.current) return;
    setIsGenerating(true);
    try {
      const currentDraftTemplate: SigTemplate = {
        ...activeTemplate,
        name: templateName,
        canvasWidth,
        canvasHeight,
        templateImageUrl,
        featuredImageBox: fBox,
        titleBox: tBox,
      };

      const dataUrl = await renderTemplateToCanvas(previewCanvasRef.current, {
        template: currentDraftTemplate,
        headline: genHeadline,
        highlightPhrase: genHighlight,
        featuredImageUrl: genPhotoUrl,
      });
      setGeneratedDataUrl(dataUrl);
    } catch (err) {
      console.error('Preview render error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [activeTemplate, templateName, canvasWidth, canvasHeight, templateImageUrl, fBox, tBox, genHeadline, genHighlight, genPhotoUrl]);

  useEffect(() => {
    if (activeTab === 'generator' || isPreviewMode) {
      handleRenderPreview();
    }
  }, [activeTab, isPreviewMode, handleRenderPreview]);

  // Save current template edits
  const handleSaveCurrentTemplate = () => {
    const updated: SigTemplate = {
      id: selectedTemplateId,
      name: templateName,
      canvasWidth,
      canvasHeight,
      templateImageUrl,
      featuredImageBox: fBox,
      titleBox: tBox,
      isDefault: activeTemplate.isDefault,
    };
    saveSigTemplate(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Open Visual Editor for a specific template
  const handleOpenVisualEditor = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setActiveTab('editor');
    setIsPreviewMode(false);
  };

  // Create new template from modal
  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplName.trim()) return;

    const newId = `tmpl_${Date.now()}`;
    const newTemplate: SigTemplate = {
      id: newId,
      name: newTmplName.trim(),
      canvasWidth: Number(newTmplWidth) || 1200,
      canvasHeight: Number(newTmplHeight) || 630,
      templateImageUrl: newTmplImageUrl.trim() || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&h=630&fit=crop&q=80',
      featuredImageBox: {
        x: 40,
        y: 40,
        width: Number(newTmplWidth) - 80,
        height: Math.round(Number(newTmplHeight) * 0.6),
        borderRadius: 12,
      },
      titleBox: {
        x: 40,
        y: Math.round(Number(newTmplHeight) * 0.68),
        width: Number(newTmplWidth) - 80,
        height: Math.round(Number(newTmplHeight) * 0.28),
        fontSize: 44,
        lineHeight: 1.35,
        textColor: '#FFFFFF',
        highlightColor: '#FBBF24',
        fontFamily: 'Noto Sans Devanagari',
        alignment: 'left',
      },
      isDefault: newTmplIsDefault,
    };

    saveSigTemplate(newTemplate);
    setSelectedTemplateId(newId);
    setIsNewModalOpen(false);
    setActiveTab('editor');
  };

  // Preset size shortcuts
  const SIZE_PRESETS = [
    { label: 'Facebook / Twitter (1200×630)', w: 1200, h: 630 },
    { label: 'Instagram Square (1080×1080)', w: 1080, h: 1080 },
    { label: 'Portrait / Story (1080×1350)', w: 1080, h: 1350 },
  ];

  // ── Drag & Resize Interaction in Visual Editor ──
  // Container display scale calculation
  const [displayScale, setDisplayScale] = useState(0.5);

  useEffect(() => {
    if (!visualEditorContainerRef.current) return;
    const containerW = visualEditorContainerRef.current.clientWidth || 600;
    const s = Math.min((containerW - 32) / canvasWidth, 0.7);
    setDisplayScale(Math.max(0.2, s));
  }, [canvasWidth, activeTab]);

  const displayWidth = Math.round(canvasWidth * displayScale);
  const displayHeight = Math.round(canvasHeight * displayScale);

  // Mouse Drag / Resize State
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize';
    boxType: 'featured' | 'title';
    handle?: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  const handleMouseDownOnBox = (
    e: React.MouseEvent,
    boxType: 'featured' | 'title',
    isHandle = false,
    handleName = ''
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveBox(boxType);

    const currentBox = boxType === 'featured' ? fBox : tBox;
    setDragState({
      type: isHandle ? 'resize' : 'move',
      boxType,
      handle: handleName,
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentBox.x,
      initialY: currentBox.y,
      initialW: currentBox.width,
      initialH: currentBox.height,
    });
  };

  const handleMouseMoveCanvas = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState) return;
      const dx = (e.clientX - dragState.startX) / displayScale;
      const dy = (e.clientY - dragState.startY) / displayScale;

      if (dragState.type === 'move') {
        const nextX = Math.round(
          Math.max(0, Math.min(canvasWidth - dragState.initialW, dragState.initialX + dx))
        );
        const nextY = Math.round(
          Math.max(0, Math.min(canvasHeight - dragState.initialH, dragState.initialY + dy))
        );

        if (dragState.boxType === 'featured') {
          setFBox((prev) => ({ ...prev, x: nextX, y: nextY }));
        } else {
          setTBox((prev) => ({ ...prev, x: nextX, y: nextY }));
        }
      } else if (dragState.type === 'resize') {
        const h = dragState.handle || 'se';
        let newX = dragState.initialX;
        let newY = dragState.initialY;
        let newW = dragState.initialW;
        let newH = dragState.initialH;

        if (h.includes('e')) newW = Math.max(80, dragState.initialW + dx);
        if (h.includes('s')) newH = Math.max(50, dragState.initialH + dy);
        if (h.includes('w')) {
          newW = Math.max(80, dragState.initialW - dx);
          newX = Math.max(0, dragState.initialX + dx);
        }
        if (h.includes('n')) {
          newH = Math.max(50, dragState.initialH - dy);
          newY = Math.max(0, dragState.initialY + dy);
        }

        if (dragState.boxType === 'featured') {
          setFBox((prev) => ({
            ...prev,
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newW),
            height: Math.round(newH),
          }));
        } else {
          setTBox((prev) => ({
            ...prev,
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newW),
            height: Math.round(newH),
          }));
        }
      }
    },
    [dragState, displayScale, canvasWidth, canvasHeight]
  );

  const handleMouseUpCanvas = () => {
    if (dragState) {
      setDragState(null);
    }
  };

  // Download Generated Image
  const handleDownloadImage = () => {
    if (!generatedDataUrl) return;
    const link = document.createElement('a');
    link.download = `social-card-${Date.now()}.jpg`;
    link.href = generatedDataUrl;
    link.click();
  };

  // Send to Composer
  const handleSendToComposer = () => {
    if (!generatedDataUrl) return;
    sessionStorage.setItem('sap_pending_composer_image', generatedDataUrl);
    sessionStorage.setItem('sap_pending_composer_text', genHeadline);
    router.push('/composer');
  };

  return (
    <div className="space-y-4 font-sans max-w-5xl animate-fade-in pb-12 select-none">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[#EEF1F6]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
              Social Image Generator (SIG Templates)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Visual template builder matching your WordPress plugin. Drag &amp; position Featured Image &amp; Headline boxes on top of your template PNG.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 bg-[#F8F9FD] p-1 rounded-xl border border-[#EEF1F6] self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            📋 Templates ({sigTemplates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            🎯 Visual Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            ⚡ Test Card Generator
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Template layout &amp; coordinates saved successfully!</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: TEMPLATES GRID */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              Saved PNG Templates ({sigTemplates.length})
            </h3>
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sigTemplates.map((t) => {
              const isSelected = t.id === selectedTemplateId;
              return (
                <div
                  key={t.id}
                  className={`bg-white rounded-2xl border p-4 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] transition-all flex flex-col justify-between space-y-3 ${
                    isSelected ? 'border-slate-900 ring-1 ring-slate-900/10' : 'border-[#EEF1F6]'
                  }`}
                >
                  <div>
                    {/* Thumbnail */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-200/50 mb-3 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.templateImageUrl}
                        alt={t.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[10px] font-mono font-bold text-white">
                          {t.canvasWidth}×{t.canvasHeight}
                        </span>
                        {t.isDefault && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-[10px] font-bold text-white shadow-xs">
                            Default Template
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">
                          {t.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Font: {t.titleBox?.fontFamily || 'Noto Sans Devanagari'} •{' '}
                          {t.titleBox?.fontSize || 44}px
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#F0F2F6] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenVisualEditor(t.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      <Layout className="w-3.5 h-3.5" />
                      <span>Visual Editor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(t.id);
                        setActiveTab('generator');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Test Card</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: VISUAL EDITOR (DRAG & RESIZE BOXES ON CANVAS) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'editor' && (
        <div className="space-y-4">
          {/* Editor Header Bar */}
          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Editing Template:</span>
              <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                {templateName} ({canvasWidth}×{canvasHeight})
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  isPreviewMode
                    ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isPreviewMode ? 'Exit Preview' : '👁️ Live Preview'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCurrentTemplate}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Template</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* ── Left Column: Interactive Visual Canvas Container ── */}
            <div
              ref={visualEditorContainerRef}
              className="lg:col-span-8 bg-slate-950/90 rounded-2xl border border-slate-800 p-4 flex flex-col items-center justify-center min-h-[460px] overflow-hidden relative"
              onMouseMove={handleMouseMoveCanvas}
              onMouseUp={handleMouseUpCanvas}
              onMouseLeave={handleMouseUpCanvas}
            >
              {isPreviewMode ? (
                /* Live Preview Canvas Render */
                <div className="flex flex-col items-center">
                  <canvas
                    ref={previewCanvasRef}
                    style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
                    className="rounded-lg shadow-2xl border border-slate-700"
                  />
                  <span className="text-[11px] text-slate-400 mt-2 font-mono">
                    Live preview rendering with sample news article &amp; Hindi headline
                  </span>
                </div>
              ) : (
                /* Interactive Box Positioning Canvas */
                <div
                  style={{
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
                    backgroundImage: `url(${templateImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  className="relative rounded-lg shadow-2xl overflow-hidden border border-slate-700 select-none bg-slate-900"
                >
                  {/* 1. Featured Image Box (Cyan / Blue) */}
                  <div
                    onMouseDown={(e) => handleMouseDownOnBox(e, 'featured')}
                    style={{
                      left: `${Math.round(fBox.x * displayScale)}px`,
                      top: `${Math.round(fBox.y * displayScale)}px`,
                      width: `${Math.round(fBox.width * displayScale)}px`,
                      height: `${Math.round(fBox.height * displayScale)}px`,
                      borderRadius: `${Math.round((fBox.borderRadius || 0) * displayScale)}px`,
                    }}
                    className={`absolute border-2 border-dashed transition-colors flex flex-col items-center justify-center cursor-move select-none ${
                      activeBox === 'featured'
                        ? 'border-cyan-400 bg-cyan-500/20 ring-2 ring-cyan-400/40'
                        : 'border-cyan-300/60 bg-cyan-500/10 hover:border-cyan-400'
                    }`}
                  >
                    <div className="bg-cyan-950/85 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>📸 Featured Image Box</span>
                    </div>

                    {/* Resize Handles (8 directions) */}
                    {['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'].map((h) => (
                      <div
                        key={h}
                        onMouseDown={(e) => handleMouseDownOnBox(e, 'featured', true, h)}
                        className={`absolute w-2.5 h-2.5 bg-cyan-400 border border-black rounded-full z-10 ${
                          h === 'nw'
                            ? '-top-1.5 -left-1.5 cursor-nwse-resize'
                            : h === 'ne'
                            ? '-top-1.5 -right-1.5 cursor-nesw-resize'
                            : h === 'se'
                            ? '-bottom-1.5 -right-1.5 cursor-nwse-resize'
                            : h === 'sw'
                            ? '-bottom-1.5 -left-1.5 cursor-nesw-resize'
                            : h === 'n'
                            ? '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize'
                            : h === 's'
                            ? '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize'
                            : h === 'e'
                            ? 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize'
                            : 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize'
                        }`}
                      />
                    ))}
                  </div>

                  {/* 2. Title Text Box (Amber / Gold) */}
                  <div
                    onMouseDown={(e) => handleMouseDownOnBox(e, 'title')}
                    style={{
                      left: `${Math.round(tBox.x * displayScale)}px`,
                      top: `${Math.round(tBox.y * displayScale)}px`,
                      width: `${Math.round(tBox.width * displayScale)}px`,
                      height: `${Math.round(tBox.height * displayScale)}px`,
                    }}
                    className={`absolute border-2 border-dashed transition-colors flex flex-col items-center justify-center cursor-move select-none ${
                      activeBox === 'title'
                        ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/40'
                        : 'border-amber-300/60 bg-amber-500/10 hover:border-amber-400'
                    }`}
                  >
                    <div className="bg-amber-950/85 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none flex items-center gap-1">
                      <Type className="w-3 h-3" />
                      <span>📝 Title Text Box</span>
                    </div>

                    {/* Resize Handles (8 directions) */}
                    {['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'].map((h) => (
                      <div
                        key={h}
                        onMouseDown={(e) => handleMouseDownOnBox(e, 'title', true, h)}
                        className={`absolute w-2.5 h-2.5 bg-amber-400 border border-black rounded-full z-10 ${
                          h === 'nw'
                            ? '-top-1.5 -left-1.5 cursor-nwse-resize'
                            : h === 'ne'
                            ? '-top-1.5 -right-1.5 cursor-nesw-resize'
                            : h === 'se'
                            ? '-bottom-1.5 -right-1.5 cursor-nwse-resize'
                            : h === 'sw'
                            ? '-bottom-1.5 -left-1.5 cursor-nesw-resize'
                            : h === 'n'
                            ? '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize'
                            : h === 's'
                            ? '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize'
                            : h === 'e'
                            ? 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize'
                            : 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between w-full max-w-md px-2 text-[11px] text-slate-400 font-medium">
                <span>Drag to reposition • Use corner handles to resize</span>
                <span className="font-mono">Zoom: {Math.round(displayScale * 100)}%</span>
              </div>
            </div>

            {/* ── Right Column: Synchronized Properties Panel ── */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EEF1F6] p-4 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4 text-xs">
              {/* Box Selector Switch */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F8F9FD] rounded-xl border border-[#EEF1F6]">
                <button
                  type="button"
                  onClick={() => setActiveBox('featured')}
                  className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeBox === 'featured'
                      ? 'bg-cyan-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Featured Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBox('title')}
                  className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeBox === 'title'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Title Box</span>
                </button>
              </div>

              {/* Coordinates Inputs (X, Y, W, H) */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <Move className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {activeBox === 'featured' ? 'Featured Image' : 'Title Box'} Position &amp; Size
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">X (px)</label>
                    <input
                      type="number"
                      value={activeBox === 'featured' ? fBox.x : tBox.x}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (activeBox === 'featured') setFBox((p) => ({ ...p, x: val }));
                        else setTBox((p) => ({ ...p, x: val }));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Y (px)</label>
                    <input
                      type="number"
                      value={activeBox === 'featured' ? fBox.y : tBox.y}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (activeBox === 'featured') setFBox((p) => ({ ...p, y: val }));
                        else setTBox((p) => ({ ...p, y: val }));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Width (px)</label>
                    <input
                      type="number"
                      value={activeBox === 'featured' ? fBox.width : tBox.width}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (activeBox === 'featured') setFBox((p) => ({ ...p, width: val }));
                        else setTBox((p) => ({ ...p, width: val }));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Height (px)</label>
                    <input
                      type="number"
                      value={activeBox === 'featured' ? fBox.height : tBox.height}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (activeBox === 'featured') setFBox((p) => ({ ...p, height: val }));
                        else setTBox((p) => ({ ...p, height: val }));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Specific Box Properties */}
              {activeBox === 'featured' ? (
                <div className="space-y-3 pt-2 border-t border-[#EEF1F6]">
                  <h4 className="font-bold text-slate-900 text-xs">Featured Image Style</h4>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Corner Radius ({fBox.borderRadius || 0}px)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={fBox.borderRadius || 0}
                      onChange={(e) => setFBox((p) => ({ ...p, borderRadius: Number(e.target.value) }))}
                      className="w-full cursor-pointer accent-cyan-600"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-[#EEF1F6]">
                  <h4 className="font-bold text-slate-900 text-xs">Typography &amp; Colors</h4>

                  {/* Font Size & Line Height */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                        Font Size ({tBox.fontSize || 44}px)
                      </label>
                      <input
                        type="number"
                        min={20}
                        max={90}
                        value={tBox.fontSize || 44}
                        onChange={(e) => setTBox((p) => ({ ...p, fontSize: Number(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                        Line Height ({tBox.lineHeight || 1.35})
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min={1.0}
                        max={2.0}
                        value={tBox.lineHeight || 1.35}
                        onChange={(e) => setTBox((p) => ({ ...p, lineHeight: Number(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold"
                      />
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                        Text Color
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={tBox.textColor || '#FFFFFF'}
                          onChange={(e) => setTBox((p) => ({ ...p, textColor: e.target.value }))}
                          className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0"
                        />
                        <span className="font-mono text-[11px] font-bold text-slate-700">
                          {tBox.textColor}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                        Highlight Color
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={tBox.highlightColor || '#FBBF24'}
                          onChange={(e) => setTBox((p) => ({ ...p, highlightColor: e.target.value }))}
                          className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0"
                        />
                        <span className="font-mono text-[11px] font-bold text-slate-700">
                          {tBox.highlightColor}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Font Family & Alignment */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                        Font Family
                      </label>
                      <select
                        value={tBox.fontFamily || 'Noto Sans Devanagari'}
                        onChange={(e) => setTBox((p) => ({ ...p, fontFamily: e.target.value }))}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold"
                      >
                        <option value="Noto Sans Devanagari">Noto Sans (Hindi)</option>
                        <option value="Poppins">Poppins</option>
                        <option value="Inter">Inter</option>
                        <option value="Roboto">Roboto</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                        Alignment
                      </label>
                      <select
                        value={tBox.alignment || 'left'}
                        onChange={(e) =>
                          setTBox((p) => ({ ...p, alignment: e.target.value as any }))
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Template PNG Source */}
              <div className="pt-2 border-t border-[#EEF1F6] space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold block">
                  Template PNG Image URL
                </label>
                <input
                  type="url"
                  value={templateImageUrl}
                  onChange={(e) => setTemplateImageUrl(e.target.value)}
                  placeholder="https://.../template.png"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: TEST CARD GENERATOR */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Controls Column */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4 text-xs">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 mb-0.5">
                Generate Card from Template
              </h3>
              <p className="text-[11px] text-slate-400">
                This exact engine automatically generates images for your RSS feed articles.
              </p>
            </div>

            {/* Template Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Select Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-bold text-slate-800"
              >
                {sigTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.canvasWidth}×{t.canvasHeight})
                  </option>
                ))}
              </select>
            </div>

            {/* Headline */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                News Headline (Title)
              </label>
              <textarea
                rows={3}
                value={genHeadline}
                onChange={(e) => setGenHeadline(e.target.value)}
                placeholder="Enter headline..."
                className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 font-semibold"
              />
            </div>

            {/* Highlight Phrase */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Highlight Phrase (Yellow / Gold Accent)
              </label>
              <input
                type="text"
                value={genHighlight}
                onChange={(e) => setGenHighlight(e.target.value)}
                placeholder="Phrase to highlight in gold..."
                className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
              />
            </div>

            {/* Featured Image URL */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Featured News Image URL
              </label>
              <input
                type="url"
                value={genPhotoUrl}
                onChange={(e) => setGenPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleRenderPreview}
              disabled={isGenerating}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Rendering...' : 'Re-render Graphic'}</span>
            </button>
          </div>

          {/* Result Column */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 mb-3">Live Generated Card</h3>
              <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-200 flex items-center justify-center min-h-[300px]">
                <canvas ref={previewCanvasRef} className="max-w-full h-auto object-contain" />
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0F2F6] flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400 font-medium">
                Dimensions: {canvasWidth}×{canvasHeight}px JPEG
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendToComposer}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Composer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD NEW TEMPLATE */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EEF1F6] max-w-lg w-full p-6 shadow-2xl animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F6]">
              <h3 className="text-base font-extrabold text-slate-900">Add New PNG Template</h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={newTmplName}
                  onChange={(e) => setNewTmplName(e.target.value)}
                  placeholder="e.g. Breaking News 1200x630 Card"
                  className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Preset Dimensions
                </label>
                <div className="space-y-1.5">
                  {SIZE_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNewTmplWidth(p.w);
                        setNewTmplHeight(p.h);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                        newTmplWidth === p.w && newTmplHeight === p.h
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-[#F8F9FD] border-[#EEF1F6] text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Template PNG Image URL
                </label>
                <input
                  type="url"
                  required
                  value={newTmplImageUrl}
                  onChange={(e) => setNewTmplImageUrl(e.target.value)}
                  placeholder="https://.../my-template.png"
                  className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  A high-resolution PNG image with transparent or designated areas for the news photo and headline.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tmpl-default"
                  checked={newTmplIsDefault}
                  onChange={(e) => setNewTmplIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 cursor-pointer"
                />
                <label htmlFor="tmpl-default" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Set as Default Template for Automations
                </label>
              </div>

              <div className="pt-3 border-t border-[#EEF1F6] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-[#F8F9FD] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Create &amp; Open Visual Editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
