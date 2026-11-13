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
  Upload,
  Music,
  FolderOpen,
  ZoomIn,
  ZoomOut,
  Info,
  SlidersHorizontal,
} from 'lucide-react';

// ── Preset Social Media Dimensions ──
const SOCIAL_SIZE_PRESETS = [
  {
    id: 'fb_landscape',
    label: 'Facebook / Web Post',
    category: 'Facebook',
    w: 1200,
    h: 630,
    aspect: '1.91:1',
    description: 'Landscape News Card (Optimal for FB Feed & Link Preview)',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'ig_square',
    label: 'Instagram / FB Square',
    category: 'Instagram / Facebook',
    w: 1080,
    h: 1080,
    aspect: '1:1',
    description: 'Square Post (Most engagement in mobile feed)',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  {
    id: 'ig_portrait',
    label: 'Instagram / FB Portrait',
    category: 'Instagram / Facebook',
    w: 1080,
    h: 1350,
    aspect: '4:5',
    description: 'Vertical Portrait (Max mobile feed visibility)',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'story_reel',
    label: 'Story / Reel / Shorts',
    category: 'Full Screen Vertical',
    w: 1080,
    h: 1920,
    aspect: '9:16',
    description: 'Story, Instagram Reel, YouTube Shorts background',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'yt_thumb',
    label: 'YouTube Thumbnail',
    category: 'YouTube',
    w: 1280,
    h: 720,
    aspect: '16:9',
    description: 'HD 720p YouTube Video & Community Post Thumbnail',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    id: 'twitter_post',
    label: 'Twitter / X In-Stream',
    category: 'Twitter / X',
    w: 1200,
    h: 675,
    aspect: '16:9',
    description: 'Landscape Tweet Card (Optimal for X feed)',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  {
    id: 'telegram_broadcast',
    label: 'Telegram Channel News',
    category: 'Telegram',
    w: 1280,
    h: 720,
    aspect: '16:9',
    description: 'Telegram Channel Broadcast Card',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
  },
];

// ── Built-in Font Options ──
const HINDI_FONTS = [
  { name: 'Noto Sans Devanagari', label: 'Noto Sans Devanagari (Clean Modern)' },
  { name: 'Rozha One', label: 'Rozha One (Heavy Bold News Headline)' },
  { name: 'Mukta', label: 'Mukta (Modern Compact Devanagari)' },
  { name: 'Hind', label: 'Hind (Bold Newspaper Title)' },
  { name: 'Tiro Devanagari Hindi', label: 'Tiro Devanagari (Editorial Serif)' },
  { name: 'Rajdhani', label: 'Rajdhani (Sharp Tech / Breaking News)' },
  { name: 'Kalam', label: 'Kalam (Casual Hindi Script)' },
  { name: 'Poppins', label: 'Poppins (Geometric Hindi & Latin)' },
];

const ENGLISH_FONTS = [
  { name: 'Inter', label: 'Inter (Neutral Sans)' },
  { name: 'Montserrat', label: 'Montserrat (Modern Bold)' },
  { name: 'Oswald', label: 'Oswald (Condensed Breaking News)' },
  { name: 'Bebas Neue', label: 'Bebas Neue (Tall Display Caps)' },
  { name: 'Playfair Display', label: 'Playfair Display (Elegant Serif)' },
];

export default function ImageGeneratorPage() {
  return (
    <AppShell>
      <SocialImageGeneratorContent />
    </AppShell>
  );
}

function SocialImageGeneratorContent() {
  const router = useRouter();
  const { sigTemplates, saveSigTemplate } = useApp();

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
      layerMode: 'overlay',
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
  const [layerMode, setLayerMode] = useState<'overlay' | 'background'>(
    activeTemplate.layerMode || 'overlay'
  );

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

  // Custom Uploaded Fonts State
  const [customFonts, setCustomFonts] = useState<Array<{ name: string; url: string }>>([]);
  const fontFileInputRef = useRef<HTMLInputElement | null>(null);

  // Load custom fonts from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sap_custom_uploaded_fonts');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCustomFonts(parsed);
            parsed.forEach((f) => {
              try {
                const fontFace = new FontFace(f.name, `url(${f.url})`);
                fontFace.load().then((loaded) => {
                  document.fonts.add(loaded);
                });
              } catch (e) {
                console.warn('Error loading custom font:', e);
              }
            });
          }
        }
      } catch {}
    }
  }, []);

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
  const [newTmplSelectedPreset, setNewTmplSelectedPreset] = useState<string>('fb_landscape');
  const [newTmplImageUrl, setNewTmplImageUrl] = useState('');
  const [newTmplLayerMode, setNewTmplLayerMode] = useState<'overlay' | 'background'>('overlay');
  const [newTmplIsDefault, setNewTmplIsDefault] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);

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
      setLayerMode(activeTemplate.layerMode || 'overlay');
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
        layerMode,
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
  }, [activeTemplate, templateName, canvasWidth, canvasHeight, templateImageUrl, layerMode, fBox, tBox, genHeadline, genHighlight, genPhotoUrl]);

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
      layerMode,
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
      layerMode: newTmplLayerMode,
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

  // Handle local template file upload (FileReader -> Base64 data URL)
  const handleTemplateFileUpload = (file: File, isNewModal: boolean = false) => {
    if (!file) return;
    setIsUploadingTemplate(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        // Measure natural dimensions
        const img = new Image();
        img.onload = () => {
          if (isNewModal) {
            setNewTmplImageUrl(dataUrl);
            setNewTmplWidth(img.naturalWidth || 1200);
            setNewTmplHeight(img.naturalHeight || 630);
            if (!newTmplName) {
              setNewTmplName(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
            }
          } else {
            setTemplateImageUrl(dataUrl);
            setCanvasWidth(img.naturalWidth || canvasWidth);
            setCanvasHeight(img.naturalHeight || canvasHeight);
          }
          setIsUploadingTemplate(false);
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Custom Font File Upload
  const handleFontFileUpload = (file: File) => {
    if (!file) return;
    const cleanFontName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        try {
          const fontFace = new FontFace(cleanFontName, `url(${dataUrl})`);
          const loaded = await fontFace.load();
          document.fonts.add(loaded);

          const updated = [...customFonts, { name: cleanFontName, url: dataUrl }];
          setCustomFonts(updated);
          localStorage.setItem('sap_custom_uploaded_fonts', JSON.stringify(updated));

          // Set active font
          setTBox((p) => ({ ...p, fontFamily: cleanFontName }));
        } catch (err) {
          console.error('Failed to register font:', err);
          alert('Font format load failed. Please upload a valid .ttf, .otf, or .woff file.');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Drag & Resize Interaction in Visual Editor ──
  const [displayScale, setDisplayScale] = useState(0.5);

  useEffect(() => {
    if (!visualEditorContainerRef.current) return;
    const containerW = visualEditorContainerRef.current.clientWidth || 600;
    const s = Math.min((containerW - 48) / canvasWidth, 0.75);
    setDisplayScale(Math.max(0.18, s));
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

  // Quick box presets
  const applyBoxPreset = (preset: 'top60' | 'bottomHeadline' | 'centerSquare' | 'fullWidth') => {
    if (activeBox === 'featured') {
      if (preset === 'top60') {
        setFBox({ x: 0, y: 0, width: canvasWidth, height: Math.round(canvasHeight * 0.65), borderRadius: 0 });
      } else if (preset === 'centerSquare') {
        const sz = Math.min(canvasWidth, canvasHeight) - 80;
        setFBox({
          x: Math.round((canvasWidth - sz) / 2),
          y: 40,
          width: sz,
          height: sz,
          borderRadius: 16,
        });
      } else if (preset === 'fullWidth') {
        setFBox({ x: 0, y: 0, width: canvasWidth, height: canvasHeight, borderRadius: 0 });
      }
    } else {
      if (preset === 'bottomHeadline') {
        setTBox((prev) => ({
          ...prev,
          x: 40,
          y: Math.round(canvasHeight * 0.68),
          width: canvasWidth - 80,
          height: Math.round(canvasHeight * 0.28),
        }));
      } else if (preset === 'fullWidth') {
        setTBox((prev) => ({
          ...prev,
          x: 40,
          y: Math.round(canvasHeight * 0.75),
          width: canvasWidth - 80,
          height: Math.round(canvasHeight * 0.2),
        }));
      }
    }
  };

  // Download Generated Image
  const handleDownloadImage = () => {
    if (!generatedDataUrl) return;
    const link = document.createElement('a');
    link.download = `news-card-${Date.now()}.png`;
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
    <div className="space-y-4 font-sans max-w-6xl animate-fade-in pb-16 select-none">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[#EEF1F6]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF007A]" />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
              Social Image Generator &amp; PNG Template Suite
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Upload custom PNG frames, set transparent photo cutouts, custom Hindi fonts, and automate cards for RSS feeds.
          </p>
        </div>

        {/* Tab Switcher */}
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
          <span>Template layout, layer order &amp; coordinates saved successfully!</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: TEMPLATES GRID */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Saved PNG Templates ({sigTemplates.length})
              </h3>
              <p className="text-xs text-slate-500">
                Transparent PNG frame overlays and background templates ready for RSS and manual posting.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF4E98] hover:opacity-95 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sigTemplates.map((t) => {
              const isSelected = t.id === selectedTemplateId;
              const isOverlay = t.layerMode !== 'background';

              return (
                <div
                  key={t.id}
                  className={`bg-white rounded-2xl border p-4 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] transition-all flex flex-col justify-between space-y-3 ${
                    isSelected ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-[#EEF1F6]'
                  }`}
                >
                  <div>
                    {/* Thumbnail Preview */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-200/50 mb-3 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.templateImageUrl}
                        alt={t.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[10px] font-mono font-bold text-white">
                          {t.canvasWidth}×{t.canvasHeight}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                            isOverlay
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isOverlay ? 'PNG Frame' : 'Background'}
                        </span>
                        {t.isDefault && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-[10px] font-bold text-white shadow-xs">
                            Default
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-1">
                        {t.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                        <Type className="w-3 h-3 text-slate-400" />
                        <span>{t.titleBox?.fontFamily || 'Noto Sans Devanagari'} • {t.titleBox?.fontSize || 44}px</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#F0F2F6] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenVisualEditor(t.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors"
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
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-[#FF007A] text-xs font-bold cursor-pointer transition-colors border border-pink-100"
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
      {/* TAB 2: VISUAL EDITOR (DRAG & RESIZE BOXES WITH REAL LAYERED PREVIEW) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'editor' && (
        <div className="space-y-4">
          {/* Editor Header Bar */}
          <div className="bg-white rounded-2xl border border-[#EEF1F6] p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500">Editing Template:</span>
              <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                {templateName}
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {canvasWidth}×{canvasHeight}
              </span>
              {/* Layer Mode Badge */}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  layerMode === 'overlay'
                    ? 'bg-pink-50 text-pink-700 border-pink-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {layerMode === 'overlay' ? 'Layer: Photo behind PNG Frame' : 'Layer: Template Background'}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end lg:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isPreviewMode
                    ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isPreviewMode ? 'Exit Canvas Mode' : '👁️ Live Output'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCurrentTemplate}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF4E98] hover:opacity-95 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
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
              className="lg:col-span-8 bg-slate-950/95 rounded-2xl border border-slate-800 p-5 flex flex-col items-center justify-center min-h-[500px] overflow-hidden relative"
              onMouseMove={handleMouseMoveCanvas}
              onMouseUp={handleMouseUpCanvas}
              onMouseLeave={handleMouseUpCanvas}
            >
              {isPreviewMode ? (
                /* Live Preview Canvas Render */
                <div className="flex flex-col items-center space-y-2">
                  <canvas
                    ref={previewCanvasRef}
                    style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
                    className="rounded-lg shadow-2xl border border-slate-700 max-w-full"
                  />
                  <span className="text-[11px] text-slate-400 font-mono">
                    Real-time composite with sample photo &amp; Hindi headline
                  </span>
                </div>
              ) : (
                /* Interactive Box Positioning with REAL Layer Stack */
                <div
                  style={{
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
                  }}
                  className="relative rounded-lg shadow-2xl overflow-hidden border border-slate-700 select-none bg-slate-900"
                >
                  {/* LAYER 1 (Bottom): Featured Photo Preview */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${Math.round(fBox.x * displayScale)}px`,
                      top: `${Math.round(fBox.y * displayScale)}px`,
                      width: `${Math.round(fBox.width * displayScale)}px`,
                      height: `${Math.round(fBox.height * displayScale)}px`,
                      borderRadius: `${Math.round((fBox.borderRadius || 0) * displayScale)}px`,
                      backgroundImage: `url(${genPhotoUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      zIndex: layerMode === 'overlay' ? 1 : 2,
                    }}
                    className="overflow-hidden"
                  />

                  {/* LAYER 2: PNG Template Frame Overlay */}
                  {templateImageUrl && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${templateImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        zIndex: layerMode === 'overlay' ? 2 : 1,
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* LAYER 3: Sample Live Headline Text */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${Math.round(tBox.x * displayScale)}px`,
                      top: `${Math.round(tBox.y * displayScale)}px`,
                      width: `${Math.round(tBox.width * displayScale)}px`,
                      height: `${Math.round(tBox.height * displayScale)}px`,
                      zIndex: 3,
                      pointerEvents: 'none',
                      color: tBox.textColor || '#FFFFFF',
                      fontSize: `${Math.round((tBox.fontSize || 44) * displayScale)}px`,
                      lineHeight: tBox.lineHeight || 1.35,
                      fontFamily: `"${tBox.fontFamily || 'Noto Sans Devanagari'}", "Poppins", sans-serif`,
                      textAlign: tBox.alignment || 'left',
                      textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                    }}
                    className="p-1 font-bold line-clamp-3"
                  >
                    {genHeadline}
                  </div>

                  {/* LAYER 4: Interactive Selection Boundary for Featured Image */}
                  <div
                    onMouseDown={(e) => handleMouseDownOnBox(e, 'featured')}
                    style={{
                      left: `${Math.round(fBox.x * displayScale)}px`,
                      top: `${Math.round(fBox.y * displayScale)}px`,
                      width: `${Math.round(fBox.width * displayScale)}px`,
                      height: `${Math.round(fBox.height * displayScale)}px`,
                      borderRadius: `${Math.round((fBox.borderRadius || 0) * displayScale)}px`,
                      zIndex: 10,
                    }}
                    className={`absolute border-2 transition-colors flex flex-col items-center justify-center cursor-move select-none ${
                      activeBox === 'featured'
                        ? 'border-cyan-400 bg-cyan-500/15 ring-2 ring-cyan-400/50'
                        : 'border-cyan-300/50 hover:border-cyan-400'
                    }`}
                  >
                    <div className="bg-cyan-950/90 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>📸 Photo Cutout Area</span>
                    </div>

                    {/* Resize Handles */}
                    {['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'].map((h) => (
                      <div
                        key={h}
                        onMouseDown={(e) => handleMouseDownOnBox(e, 'featured', true, h)}
                        className={`absolute w-3 h-3 bg-cyan-400 border border-black rounded-full z-20 ${
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

                  {/* LAYER 5: Interactive Selection Boundary for Title Box */}
                  <div
                    onMouseDown={(e) => handleMouseDownOnBox(e, 'title')}
                    style={{
                      left: `${Math.round(tBox.x * displayScale)}px`,
                      top: `${Math.round(tBox.y * displayScale)}px`,
                      width: `${Math.round(tBox.width * displayScale)}px`,
                      height: `${Math.round(tBox.height * displayScale)}px`,
                      zIndex: 11,
                    }}
                    className={`absolute border-2 transition-colors flex flex-col items-center justify-center cursor-move select-none ${
                      activeBox === 'title'
                        ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/50'
                        : 'border-amber-300/50 hover:border-amber-400'
                    }`}
                  >
                    <div className="bg-amber-950/90 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none flex items-center gap-1">
                      <Type className="w-3 h-3" />
                      <span>📝 Headline Text Box</span>
                    </div>

                    {/* Resize Handles */}
                    {['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'].map((h) => (
                      <div
                        key={h}
                        onMouseDown={(e) => handleMouseDownOnBox(e, 'title', true, h)}
                        className={`absolute w-3 h-3 bg-amber-400 border border-black rounded-full z-20 ${
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

              {/* Canvas Footer Controls */}
              <div className="mt-4 flex flex-wrap items-center justify-between w-full max-w-lg px-2 text-[11px] text-slate-400 font-medium gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Cyan: Photo Cutout</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 ml-2" />
                  <span>Amber: Headline Text</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDisplayScale((s) => Math.max(0.15, s - 0.05))}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="font-mono">{Math.round(displayScale * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setDisplayScale((s) => Math.min(1.2, s + 0.05))}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right Column: Properties & Font Management Panel ── */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EEF1F6] p-4 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4 text-xs">
              {/* Layer Stacking Order Setting */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#FF007A]" />
                  <span>Template Layering Mode:</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F8F9FD] rounded-xl border border-[#EEF1F6]">
                  <button
                    type="button"
                    onClick={() => setLayerMode('overlay')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      layerMode === 'overlay'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    PNG Frame Overlay
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayerMode('background')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      layerMode === 'background'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    Background Card
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  {layerMode === 'overlay'
                    ? 'Photo transparent cutout ke peeche lagegi aur PNG frame upar chipkegi.'
                    : 'Template peeche rahegi aur photo uske upar chipkegi.'}
                </p>
              </div>

              {/* Box Selector Switch */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F8F9FD] rounded-xl border border-[#EEF1F6]">
                <button
                  type="button"
                  onClick={() => setActiveBox('featured')}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeBox === 'featured'
                      ? 'bg-cyan-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Photo Cutout</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBox('title')}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeBox === 'title'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Headline Box</span>
                </button>
              </div>

              {/* Quick Box Alignment Presets */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Quick Layout Presets:</span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => applyBoxPreset(activeBox === 'featured' ? 'top60' : 'bottomHeadline')}
                    className="px-2 py-1 rounded bg-[#F8F9FD] hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-[#EEF1F6]"
                  >
                    {activeBox === 'featured' ? 'Top 65%' : 'Bottom Text'}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBoxPreset(activeBox === 'featured' ? 'centerSquare' : 'fullWidth')}
                    className="px-2 py-1 rounded bg-[#F8F9FD] hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-[#EEF1F6]"
                  >
                    {activeBox === 'featured' ? 'Square Center' : 'Full Banner'}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBoxPreset('fullWidth')}
                    className="px-2 py-1 rounded bg-[#F8F9FD] hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-[#EEF1F6]"
                  >
                    Full Bleed
                  </button>
                </div>
              </div>

              {/* Coordinates Inputs (X, Y, W, H) */}
              <div className="space-y-2 pt-2 border-t border-[#EEF1F6]">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <Move className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {activeBox === 'featured' ? 'Photo Cutout' : 'Headline Box'} Position &amp; Size
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
                  <h4 className="font-bold text-slate-900 text-xs">Featured Photo Style</h4>
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
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs">Typography &amp; Fonts</h4>
                    <button
                      type="button"
                      onClick={() => fontFileInputRef.current?.click()}
                      className="text-[10px] font-bold text-[#FF007A] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Font (.ttf/.woff)</span>
                    </button>
                    <input
                      ref={fontFileInputRef}
                      type="file"
                      accept=".ttf,.otf,.woff,.woff2"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFontFileUpload(f);
                      }}
                    />
                  </div>

                  {/* Font Family Dropdown with Hindi & English Groups */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                      Font Family
                    </label>
                    <select
                      value={tBox.fontFamily || 'Noto Sans Devanagari'}
                      onChange={(e) => setTBox((p) => ({ ...p, fontFamily: e.target.value }))}
                      className="w-full px-2.5 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-bold text-slate-800 focus:outline-none focus:border-[#FF007A]"
                    >
                      <optgroup label="🇮🇳 Hindi / Devanagari Fonts">
                        {HINDI_FONTS.map((hf) => (
                          <option key={hf.name} value={hf.name}>
                            {hf.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🔤 English Headline Fonts">
                        {ENGLISH_FONTS.map((ef) => (
                          <option key={ef.name} value={ef.name}>
                            {ef.label}
                          </option>
                        ))}
                      </optgroup>
                      {customFonts.length > 0 && (
                        <optgroup label="📁 Uploaded Custom Fonts">
                          {customFonts.map((cf) => (
                            <option key={cf.name} value={cf.name}>
                              {cf.name} (Custom)
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  {/* Font Size & Line Height */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                        Font Size ({tBox.fontSize || 44}px)
                      </label>
                      <input
                        type="number"
                        min={20}
                        max={120}
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
                        Headline Text Color
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
                        Gold Highlight Color
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

                  {/* Alignment */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                      Text Alignment
                    </label>
                    <select
                      value={tBox.alignment || 'left'}
                      onChange={(e) =>
                        setTBox((p) => ({ ...p, alignment: e.target.value as any }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold"
                    >
                      <option value="left">Left Align</option>
                      <option value="center">Center Align</option>
                      <option value="right">Right Align</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Template PNG Frame Source (Upload or URL) */}
              <div className="pt-2 border-t border-[#EEF1F6] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-700 font-extrabold block">
                    Template PNG Image / Frame
                  </label>
                  <label className="text-[10px] font-bold text-pink-600 hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Upload PNG File</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleTemplateFileUpload(file, false);
                      }}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={templateImageUrl}
                  onChange={(e) => setTemplateImageUrl(e.target.value)}
                  placeholder="Paste PNG URL or use Upload button..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono truncate"
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
                Live engine testing: RSS automated articles will be rendered using this exact layout.
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
                Highlight Phrase (Gold / Accent Color)
              </label>
              <input
                type="text"
                value={genHighlight}
                onChange={(e) => setGenHighlight(e.target.value)}
                placeholder="Phrase to highlight in gold..."
                className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
              />
            </div>

            {/* Featured Image URL or File Upload */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Featured News Photo
                </label>
                <label className="text-[10px] font-bold text-[#FF007A] hover:underline cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result) setGenPhotoUrl(ev.target.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              <input
                type="text"
                value={genPhotoUrl}
                onChange={(e) => setGenPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900 font-mono truncate"
              />
            </div>

            <button
              type="button"
              onClick={handleRenderPreview}
              disabled={isGenerating}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Rendering Card...' : 'Re-render Graphic'}</span>
            </button>
          </div>

          {/* Result Column */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span className="font-extrabold text-slate-900 text-sm">
                    Generated Card Preview ({canvasWidth}×{canvasHeight})
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  {layerMode === 'overlay' ? 'PNG Frame Layer' : 'Standard Card'}
                </span>
              </div>

              {/* Render Canvas */}
              <div className="rounded-xl overflow-hidden bg-slate-950 p-2 flex items-center justify-center border border-slate-200">
                <canvas
                  ref={previewCanvasRef}
                  className="max-w-full h-auto rounded shadow-lg object-contain"
                />
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-[#EEF1F6] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={!generatedDataUrl}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Download PNG</span>
              </button>

              <button
                type="button"
                onClick={handleSendToComposer}
                disabled={!generatedDataUrl}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF4E98] hover:opacity-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to Composer →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD NEW TEMPLATE WITH FULL SIZE PRESETS & UPLOAD */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EEF1F6] max-w-xl w-full p-6 shadow-2xl animate-fade-in space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F6]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-[#FF007A]">
                  <Layout className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Add New Social Template</h3>
                  <p className="text-[11px] text-slate-400">Choose dimension preset and upload your PNG frame</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              {/* Template Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={newTmplName}
                  onChange={(e) => setNewTmplName(e.target.value)}
                  placeholder="e.g. Breaking News 1200x630 Frame"
                  className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-semibold focus:outline-none focus:border-[#FF007A]"
                />
              </div>

              {/* Social Media Dimension Presets */}
              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1.5">
                  Select Dimension Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SOCIAL_SIZE_PRESETS.map((p) => {
                    const isSelected = newTmplSelectedPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setNewTmplSelectedPreset(p.id);
                          setNewTmplWidth(p.w);
                          setNewTmplHeight(p.h);
                        }}
                        className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                          isSelected
                            ? 'border-[#FF007A] bg-pink-50/50 ring-1 ring-[#FF007A]'
                            : 'border-[#EEF1F6] bg-[#F8F9FD] hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900">{p.label}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold border ${p.badgeColor}`}>
                            {p.aspect}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>{p.w} × {p.h} px</span>
                          <span className="text-[10px] text-slate-400">{p.category}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Dimensions Input */}
              <div className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] space-y-2">
                <span className="text-[11px] font-bold text-slate-700">Custom Dimensions (px):</span>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Width</label>
                    <input
                      type="number"
                      value={newTmplWidth}
                      onChange={(e) => {
                        setNewTmplWidth(Number(e.target.value));
                        setNewTmplSelectedPreset('custom');
                      }}
                      className="w-full px-2.5 py-1 rounded-lg border border-[#EEF1F6] bg-white text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Height</label>
                    <input
                      type="number"
                      value={newTmplHeight}
                      onChange={(e) => {
                        setNewTmplHeight(Number(e.target.value));
                        setNewTmplSelectedPreset('custom');
                      }}
                      className="w-full px-2.5 py-1 rounded-lg border border-[#EEF1F6] bg-white text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Template PNG Frame Image: Upload or URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 block">
                    Template PNG Frame (with transparent photo cutout)
                  </label>
                  <label className="text-[11px] font-bold text-[#FF007A] hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleTemplateFileUpload(file, true);
                      }}
                    />
                  </label>
                </div>

                {/* Drag and Drop Upload Box */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleTemplateFileUpload(file, true);
                  }}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#FF007A] bg-[#F8F9FD] text-center space-y-1.5 transition-colors cursor-pointer"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/png,image/jpeg,image/webp';
                    input.onchange = (ev: any) => {
                      const file = ev.target?.files?.[0];
                      if (file) handleTemplateFileUpload(file, true);
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    Click to select or drag &amp; drop your transparent PNG template
                  </p>
                  <p className="text-[10px] text-slate-400">
                    PNG format recommended. Photo will render behind the transparent cutout area.
                  </p>
                </div>

                {newTmplImageUrl && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate flex-1">Image loaded ({newTmplWidth}×{newTmplHeight})</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={newTmplImageUrl}
                      alt="Thumbnail preview"
                      className="w-10 h-6 object-cover rounded border border-slate-200"
                    />
                  </div>
                )}

                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Or paste image URL:</span>
                  <input
                    type="url"
                    value={newTmplImageUrl}
                    onChange={(e) => setNewTmplImageUrl(e.target.value)}
                    placeholder="https://.../my-frame.png"
                    className="w-full px-3 py-1.5 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono"
                  />
                </div>
              </div>

              {/* Layer Mode */}
              <div className="p-3 rounded-xl bg-[#F8F9FD] border border-[#EEF1F6] space-y-1">
                <span className="text-[11px] font-bold text-slate-700">Layering Style:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="layerMode"
                      value="overlay"
                      checked={newTmplLayerMode === 'overlay'}
                      onChange={() => setNewTmplLayerMode('overlay')}
                      className="accent-[#FF007A]"
                    />
                    <span>PNG Frame Overlay (Photo behind cutout)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="layerMode"
                      value="background"
                      checked={newTmplLayerMode === 'background'}
                      onChange={() => setNewTmplLayerMode('background')}
                      className="accent-[#FF007A]"
                    />
                    <span>Template Background</span>
                  </label>
                </div>
              </div>

              {/* Default Template for RSS */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tmpl-default"
                  checked={newTmplIsDefault}
                  onChange={(e) => setNewTmplIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FF007A] cursor-pointer accent-[#FF007A]"
                />
                <label htmlFor="tmpl-default" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Set as Default Template for RSS Auto-Posting
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
                  disabled={isUploadingTemplate}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#FF4E98] hover:opacity-95 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60"
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
