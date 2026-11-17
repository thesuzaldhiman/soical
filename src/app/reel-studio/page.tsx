'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { SigTemplate, VideoMotionEffect, VideoOverlayType } from '@/types';
import { renderTemplateToCanvas } from '@/lib/services/image-compositor';
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
  Play,
  Pause,
  Download,
  Upload,
  Plus,
  Trash2,
  Star,
  Volume2,
  VolumeX,
  Music,
  Check,
  RotateCcw,
  Layout,
  Type,
  ImageIcon,
  Move,
  Minus,
  ZoomIn,
  ZoomOut,
  Eye,
  Settings,
  Sliders,
  CalendarClock,
  BookmarkCheck,
} from 'lucide-react';

// ── Built-in Animation Effects ──
const MOTION_EFFECTS: Array<{
  id: VideoMotionEffect;
  name: string;
  icon: string;
  badge: string;
  badgeColor: string;
  description: string;
}> = [
  {
    id: 'shake',
    name: 'Camera Shake (Impact)',
    icon: '⚡',
    badge: 'Breaking News',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    description: 'Subtle high-impact vibration jitter. Perfect for breaking news, crime, and urgent announcements.',
  },
  {
    id: 'breaking_jitter',
    name: 'Breaking News Flash Jitter',
    icon: '💥',
    badge: 'Urgent Alert',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Rapid strobe camera jitter with periodic brightness flash for major breaking headlines.',
  },
  {
    id: 'zoom_in',
    name: 'Slow Zoom In',
    icon: '🔍',
    badge: 'Dramatic Focus',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Cinematic Ken Burns slow zoom into the center of the news card.',
  },
  {
    id: 'zoom_out',
    name: 'Slow Zoom Out',
    icon: '🔎',
    badge: 'Cinematic Reveal',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Slow zoom out starting close and smoothly revealing the entire news card.',
  },
  {
    id: 'pan_left',
    name: 'Dynamic Pan Left',
    icon: '◀️',
    badge: 'Cinematic Pan',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Smooth horizontal camera drift from right to left across the card.',
  },
  {
    id: 'pan_right',
    name: 'Dynamic Pan Right',
    icon: '▶️',
    badge: 'Cinematic Pan',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Smooth horizontal camera drift from left to right across the card.',
  },
  {
    id: 'glitter',
    name: 'Glitter & Sparkles',
    icon: '✨',
    badge: 'Devotional / Mandir',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Warm shimmering light pulses and sparkling glow. Ideal for temples, festivals, and cultural news.',
  },
  {
    id: 'pulse',
    name: 'Subtle Breathing Pulse',
    icon: '💓',
    badge: 'Rhythmic Alert',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
    description: 'Gentle rhythmic breathing scale pulse that keeps viewer attention locked.',
  },
  {
    id: 'none',
    name: 'Static Card Hold',
    icon: '⏹️',
    badge: 'Still Frame',
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
    description: 'Crisp static hold with background music and audio fade-out.',
  },
];

// ── Multi-select Video Overlays ──
const VIDEO_OVERLAYS: Array<{
  id: VideoOverlayType;
  name: string;
  icon: string;
  badge: string;
  badgeColor: string;
  description: string;
}> = [
  {
    id: 'breaking_banner',
    name: 'Breaking News Red Ticker',
    icon: '🔴',
    badge: 'Red Ticker',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    description: 'Solid red lower-third alert ticker bar across the reel.',
  },
  {
    id: 'red_alert',
    name: 'Red Alert Flashing Borders',
    icon: '🚨',
    badge: 'Emergency Border',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Pulsing red hazard strobe stripes on the top and bottom borders.',
  },
  {
    id: 'vignette',
    name: 'Cinematic Corner Vignette',
    icon: '🌑',
    badge: 'Dark Shadow',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    description: 'Smooth corner darkening that focuses viewer eyes directly on content.',
  },
  {
    id: 'film_grain',
    name: 'Vintage Film Grain',
    icon: '🎞️',
    badge: 'Film Texture',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Subtle high-end 35mm motion film noise for an authentic cinema look.',
  },
  {
    id: 'particles',
    name: 'Shimmering Light Leaks',
    icon: '✨',
    badge: 'Light Glow',
    badgeColor: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    description: 'Gentle ambient warmth and light particles, ideal for devotional & festive reels.',
  },
];

// ── Preset Category-Specific Music Tracks ──
const PRESET_MUSIC_TRACKS = [
  {
    id: 'breaking',
    name: 'Breaking News Beat',
    category: '🔴 Breaking News',
    badge: 'Urgent Alert',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    url: '/uploads/audio/breaking_news_beat.mp3',
    description: 'High-energy siren pulse, urgent drums, dramatic brass for breaking news.',
  },
  {
    id: 'cricket',
    name: 'Cricket & Sports Action Beat',
    category: '🏏 Cricket & Sports',
    badge: 'Stadium Action',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    url: '/uploads/audio/sports_cricket_beat.mp3',
    description: 'Fast upbeat stadium claps, high-energy synth, punchy bass for match updates & IPL.',
  },
  {
    id: 'devotional',
    name: 'Dharam & Devotional Ambient Flute',
    category: '🕉️ Dharam / Bhakti',
    badge: 'Peaceful / Temple',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    url: '/uploads/audio/devotional_ambient.mp3',
    description: 'Calm bansuri flute, temple bells, sitar, and spiritual meditation vibe.',
  },
  {
    id: 'crime',
    name: 'Crime & Suspense Pulse',
    category: '🚨 Crime & Mystery',
    badge: 'Dark Thriller',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    url: '/uploads/audio/dramatic_pulse.mp3',
    description: 'Deep cello pulse, dark suspense, heartbeat tension for crime & investigation stories.',
  },
  {
    id: 'viral',
    name: 'Trending Tech / Viral Beat',
    category: '📈 Viral & Trending',
    badge: 'Modern Lo-Fi',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    url: '/uploads/audio/viral_lofi_beat.mp3',
    description: 'Smooth modern hip-hop lo-fi beat, crisp snare, perfect for viral facts & youth news.',
  },
];

export default function ReelStudioPage() {
  const router = useRouter();
  const { sigTemplates, saveSigTemplate, deleteSigTemplate } = useApp();

  // Active top-level tab: 'templates' | 'editor' | 'motion' | 'generator'
  const [activeTab, setActiveTab] = useState<'templates' | 'editor' | 'motion' | 'generator'>('templates');

  // Filter templates suitable for Reels (9:16 portrait or explicit reel type)
  const reelTemplates = useMemo(() => {
    const matched = sigTemplates.filter(
      (t) =>
        t.templateType === 'reel' ||
        (t.canvasHeight && t.canvasHeight > t.canvasWidth) ||
        t.videoConfig?.enabled
    );
    return matched.length > 0 ? matched : sigTemplates;
  }, [sigTemplates]);

  // Selected template id
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    reelTemplates[0]?.id || sigTemplates[0]?.id || 'tmpl_reel_9x16'
  );

  // Auto-heal selectedTemplateId
  useEffect(() => {
    if (reelTemplates.length > 0 && !reelTemplates.some((t) => t.id === selectedTemplateId)) {
      setSelectedTemplateId(reelTemplates[0].id);
    }
  }, [reelTemplates, selectedTemplateId]);

  const activeTemplate = useMemo(() => {
    return (
      reelTemplates.find((t) => t.id === selectedTemplateId) ||
      sigTemplates.find((t) => t.id === selectedTemplateId) ||
      reelTemplates[0] ||
      sigTemplates[0] || {
        id: 'tmpl_reel_9x16',
        name: 'Vertical Reel & Shorts 1080x1920',
        templateType: 'reel',
        canvasWidth: 1080,
        canvasHeight: 1920,
        templateImageUrl: '',
        layerMode: 'overlay',
        videoConfig: {
          enabled: true,
          durationSeconds: 15,
          effect: 'shake',
          overlays: ['vignette'],
          musicName: 'Breaking News Beat',
          musicUrl: '/uploads/audio/breaking_news_beat.mp3',
          musicVolume: 100,
        },
        featuredImageBox: { x: 40, y: 220, width: 1000, height: 980, borderRadius: 24 },
        titleBox: {
          x: 60,
          y: 1260,
          width: 960,
          height: 480,
          fontSize: 56,
          lineHeight: 1.35,
          textColor: '#FFFFFF',
          highlightColor: '#FACC15',
          fontFamily: 'Noto Sans Devanagari',
          alignment: 'center',
        },
        isDefault: false,
      }
    );
  }, [reelTemplates, sigTemplates, selectedTemplateId]);

  // ── Template Editor State ──
  const [templateName, setTemplateName] = useState(activeTemplate.name);
  const [canvasWidth, setCanvasWidth] = useState(activeTemplate.canvasWidth || 1080);
  const [canvasHeight, setCanvasHeight] = useState(activeTemplate.canvasHeight || 1920);
  const [templateImageUrl, setTemplateImageUrl] = useState(activeTemplate.templateImageUrl || '');
  const [backgroundColor, setBackgroundColor] = useState<string>(activeTemplate.backgroundColor || '#0B0F19');
  const [layerMode, setLayerMode] = useState<'overlay' | 'background'>(
    activeTemplate.layerMode || 'overlay'
  );

  type FBoxType = NonNullable<SigTemplate['featuredImageBox']>;
  type TBoxType = NonNullable<SigTemplate['titleBox']>;

  const [fBox, setFBox] = useState<FBoxType>(
    activeTemplate.featuredImageBox || { x: 40, y: 220, width: 1000, height: 980, borderRadius: 24 }
  );
  const [tBox, setTBox] = useState<TBoxType>(
    activeTemplate.titleBox || {
      x: 60,
      y: 1260,
      width: 960,
      height: 480,
      fontSize: 56,
      lineHeight: 1.35,
      textColor: '#FFFFFF',
      highlightColor: '#FACC15',
      fontFamily: 'Noto Sans Devanagari',
      alignment: 'center',
    }
  );

  // Active box in visual editor
  const [activeBox, setActiveBox] = useState<'featured' | 'title'>('featured');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Reel template saved successfully!');

  // ── Motion & Music Config State ──
  const [effect, setEffect] = useState<VideoMotionEffect>(
    activeTemplate.videoConfig?.effect || 'shake'
  );
  const [duration, setDuration] = useState<number>(
    activeTemplate.videoConfig?.durationSeconds || 15
  );
  const [selectedOverlays, setSelectedOverlays] = useState<VideoOverlayType[]>(
    activeTemplate.videoConfig?.overlays || ['vignette']
  );
  const [musicUrl, setMusicUrl] = useState<string>(
    activeTemplate.videoConfig?.musicUrl || '/uploads/audio/breaking_news_beat.mp3'
  );
  const [musicName, setMusicName] = useState<string>(
    activeTemplate.videoConfig?.musicName || 'Breaking News Beat'
  );
  const [musicVolume, setMusicVolume] = useState<number>(
    activeTemplate.videoConfig?.musicVolume ?? 100
  );

  // Audio Play Preview State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // ── Generator Test State ──
  const [genHeadline, setGenHeadline] = useState(
    'सुक्खू सरकार का बड़ा फैसला : हिमकेयर बंद, अब मिलेगा ₹10 लाख तक फ्री इलाज!'
  );
  const [genHighlight, setGenHighlight] = useState('₹10 लाख तक फ्री इलाज');
  const [genPhotoUrl, setGenPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1080&h=1920&fit=crop&q=80'
  );
  const [isGeneratingReel, setIsGeneratingReel] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedVideoSize, setGeneratedVideoSize] = useState<number | null>(null);

  // ── New Reel Template Modal ──
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplImageUrl, setNewTmplImageUrl] = useState('');
  const [newTmplMusicPreset, setNewTmplMusicPreset] = useState('breaking');
  const [newTmplEffect, setNewTmplEffect] = useState<VideoMotionEffect>('shake');

  // Canvas Refs & Scale
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualEditorContainerRef = useRef<HTMLDivElement | null>(null);
  const editorFrameInputRef = useRef<HTMLInputElement | null>(null);
  const [displayScale, setDisplayScale] = useState(0.32);

  // Synchronize when active template switches
  useEffect(() => {
    const target =
      reelTemplates.find((t) => t.id === selectedTemplateId) ||
      sigTemplates.find((t) => t.id === selectedTemplateId) ||
      activeTemplate;

    if (target) {
      setTemplateName(target.name);
      setCanvasWidth(target.canvasWidth || 1080);
      setCanvasHeight(target.canvasHeight || 1920);
      setTemplateImageUrl(target.templateImageUrl || '');
      setBackgroundColor(target.backgroundColor || '#0B0F19');
      setLayerMode(target.layerMode || 'overlay');

      const isPort = (target.canvasHeight || 1920) > (target.canvasWidth || 1080);
      setFBox(
        target.featuredImageBox
          ? { ...target.featuredImageBox }
          : {
              x: 40,
              y: Math.round((target.canvasHeight || 1920) * 0.12),
              width: (target.canvasWidth || 1080) - 80,
              height: Math.round((target.canvasHeight || 1920) * 0.52),
              borderRadius: 24,
            }
      );
      setTBox(
        target.titleBox
          ? { ...target.titleBox }
          : {
              x: 60,
              y: Math.round((target.canvasHeight || 1920) * 0.65),
              width: (target.canvasWidth || 1080) - 120,
              height: Math.round((target.canvasHeight || 1920) * 0.28),
              fontSize: 56,
              lineHeight: 1.35,
              textColor: '#FFFFFF',
              highlightColor: '#FACC15',
              fontFamily: 'Noto Sans Devanagari',
              alignment: 'center',
            }
      );

      // Video config
      setEffect(target.videoConfig?.effect || 'shake');
      setDuration(target.videoConfig?.durationSeconds || 15);
      setSelectedOverlays(target.videoConfig?.overlays || ['vignette']);
      setMusicUrl(target.videoConfig?.musicUrl || '/uploads/audio/breaking_news_beat.mp3');
      setMusicName(target.videoConfig?.musicName || 'Breaking News Beat');
      setMusicVolume(target.videoConfig?.musicVolume ?? 100);
      setGeneratedVideoUrl(null);
    }
  }, [selectedTemplateId]);

  // Adjust display scale for vertical 9:16 canvas container
  useEffect(() => {
    if (!visualEditorContainerRef.current) return;
    const containerH = 580;
    const s = Math.min(containerH / canvasHeight, 0.42);
    setDisplayScale(Math.max(0.18, s));
  }, [canvasHeight, canvasWidth, activeTab]);

  const displayWidth = Math.round(canvasWidth * displayScale);
  const displayHeight = Math.round(canvasHeight * displayScale);

  // ── Drag & Resize Interaction in Visual Canvas ──
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

  // ── Keyboard Arrow Keys Nudge Controls (1px nudge, Shift = 10px) ──
  useEffect(() => {
    if (activeTab !== 'editor') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        if (activeBox === 'featured') {
          setFBox((prev) => ({
            ...prev,
            x: Math.max(0, Math.min(canvasWidth - prev.width, prev.x + dx)),
            y: Math.max(0, Math.min(canvasHeight - prev.height, prev.y + dy)),
          }));
        } else {
          setTBox((prev) => ({
            ...prev,
            x: Math.max(0, Math.min(canvasWidth - prev.width, prev.x + dx)),
            y: Math.max(0, Math.min(canvasHeight - prev.height, prev.y + dy)),
          }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeBox, canvasWidth, canvasHeight]);

  // 1-Click Card Layout Presets for Vertical Reels
  const applyFullCardPreset = (preset: 'topPhoto' | 'topHeadline' | 'fullBleed') => {
    if (preset === 'topPhoto') {
      // 9:16: Photo top 52%, Headline bottom 40%
      setFBox({
        x: 40,
        y: Math.round(canvasHeight * 0.08),
        width: canvasWidth - 80,
        height: Math.round(canvasHeight * 0.52),
        borderRadius: 24,
      });
      setTBox((prev) => ({
        ...prev,
        x: Math.round(canvasWidth * 0.06),
        y: Math.round(canvasHeight * 0.63),
        width: Math.round(canvasWidth * 0.88),
        height: Math.round(canvasHeight * 0.32),
        alignment: 'center',
      }));
    } else if (preset === 'topHeadline') {
      // 9:16: Headline top 30%, Photo center/bottom 60%
      setTBox((prev) => ({
        ...prev,
        x: Math.round(canvasWidth * 0.06),
        y: Math.round(canvasHeight * 0.06),
        width: Math.round(canvasWidth * 0.88),
        height: Math.round(canvasHeight * 0.30),
        alignment: 'center',
      }));
      setFBox({
        x: 40,
        y: Math.round(canvasHeight * 0.38),
        width: canvasWidth - 80,
        height: Math.round(canvasHeight * 0.56),
        borderRadius: 24,
      });
    } else if (preset === 'fullBleed') {
      // 9:16: Full bleed vertical photo with lower third overlay
      setFBox({
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
        borderRadius: 0,
      });
      setTBox((prev) => ({
        ...prev,
        x: Math.round(canvasWidth * 0.06),
        y: Math.round(canvasHeight * 0.72),
        width: Math.round(canvasWidth * 0.88),
        height: Math.round(canvasHeight * 0.24),
        alignment: 'left',
      }));
    }
  };

  // Align active box
  const alignActiveBox = (action: 'centerX' | 'centerY' | 'fullWidth' | 'snapTop' | 'snapBottom') => {
    if (activeBox === 'featured') {
      setFBox((prev) => {
        let { x, y, width, height } = prev;
        if (action === 'centerX') x = Math.round((canvasWidth - width) / 2);
        if (action === 'centerY') y = Math.round((canvasHeight - height) / 2);
        if (action === 'fullWidth') {
          x = 0;
          width = canvasWidth;
        }
        if (action === 'snapTop') y = 0;
        if (action === 'snapBottom') y = canvasHeight - height;
        return { ...prev, x: Math.max(0, x), y: Math.max(0, y), width, height };
      });
    } else {
      setTBox((prev) => {
        let { x, y, width, height } = prev;
        if (action === 'centerX') x = Math.round((canvasWidth - width) / 2);
        if (action === 'centerY') y = Math.round((canvasHeight - height) / 2);
        if (action === 'fullWidth') {
          x = Math.round(canvasWidth * 0.05);
          width = Math.round(canvasWidth * 0.90);
        }
        if (action === 'snapTop') y = 40;
        if (action === 'snapBottom') y = canvasHeight - height - 40;
        return { ...prev, x: Math.max(0, x), y: Math.max(0, y), width, height };
      });
    }
  };

  // Coordinate stepper
  const adjustActiveBoxCoordinate = (prop: 'x' | 'y' | 'width' | 'height', delta: number) => {
    if (activeBox === 'featured') {
      setFBox((prev) => {
        const nextVal = Math.max(0, (prev[prop] || 0) + delta);
        if (prop === 'width') {
          return { ...prev, width: Math.min(canvasWidth - prev.x, Math.max(40, nextVal)) };
        }
        if (prop === 'height') {
          return { ...prev, height: Math.min(canvasHeight - prev.y, Math.max(40, nextVal)) };
        }
        if (prop === 'x') {
          return { ...prev, x: Math.min(canvasWidth - prev.width, nextVal) };
        }
        if (prop === 'y') {
          return { ...prev, y: Math.min(canvasHeight - prev.height, nextVal) };
        }
        return prev;
      });
    } else {
      setTBox((prev) => {
        const nextVal = Math.max(0, (prev[prop] || 0) + delta);
        if (prop === 'width') {
          return { ...prev, width: Math.min(canvasWidth - prev.x, Math.max(40, nextVal)) };
        }
        if (prop === 'height') {
          return { ...prev, height: Math.min(canvasHeight - prev.y, Math.max(40, nextVal)) };
        }
        if (prop === 'x') {
          return { ...prev, x: Math.min(canvasWidth - prev.width, nextVal) };
        }
        if (prop === 'y') {
          return { ...prev, y: Math.min(canvasHeight - prev.height, nextVal) };
        }
        return prev;
      });
    }
  };

  // Toggle Video Overlay selection
  const handleToggleOverlay = (ovId: VideoOverlayType) => {
    setSelectedOverlays((prev) => {
      if (prev.includes(ovId)) {
        return prev.filter((item) => item !== ovId);
      } else {
        return [...prev, ovId];
      }
    });
  };

  // Save current template to Database
  const handleSaveCurrentReelTemplate = () => {
    const updated: SigTemplate = {
      ...activeTemplate,
      id: selectedTemplateId,
      name: templateName,
      templateType: 'reel',
      canvasWidth,
      canvasHeight,
      templateImageUrl,
      backgroundColor,
      layerMode,
      featuredImageBox: { ...fBox },
      titleBox: { ...tBox },
      videoConfig: {
        enabled: true,
        durationSeconds: duration,
        effect,
        overlays: selectedOverlays,
        musicUrl,
        musicName,
        musicVolume,
        targetPlatforms: ['facebook', 'instagram', 'youtube'],
      },
    };
    saveSigTemplate(updated);
    setSaveMessage(`Reel template "${templateName}" saved to database!`);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Switch template in editor
  const handleSwitchTemplateInEditor = (newId: string) => {
    if (newId === selectedTemplateId) return;

    // Auto-save current
    const currentUpdated: SigTemplate = {
      ...activeTemplate,
      id: selectedTemplateId,
      name: templateName,
      templateType: 'reel',
      canvasWidth,
      canvasHeight,
      templateImageUrl,
      backgroundColor,
      layerMode,
      featuredImageBox: { ...fBox },
      titleBox: { ...tBox },
      videoConfig: {
        enabled: true,
        durationSeconds: duration,
        effect,
        overlays: selectedOverlays,
        musicUrl,
        musicName,
        musicVolume,
        targetPlatforms: ['facebook', 'instagram', 'youtube'],
      },
    };
    saveSigTemplate(currentUpdated);
    setSelectedTemplateId(newId);
  };

  // Delete Reel Template
  const handleDeleteTemplate = (templateId: string, name: string) => {
    if (reelTemplates.length <= 1) {
      alert('Kam se kam 1 Reel template hona zaroori hai. Is template ko delete nahi kiya ja sakta.');
      return;
    }
    const confirmed = window.confirm(
      `Kya aap Reel template "${name}" ko delete karna chahte hain? Ye permanently remove ho jayega.`
    );
    if (!confirmed) return;

    deleteSigTemplate(templateId);
    if (selectedTemplateId === templateId) {
      const remaining = reelTemplates.filter((t) => t.id !== templateId);
      if (remaining.length > 0) {
        setSelectedTemplateId(remaining[0].id);
      }
    }
    setSaveMessage(`Reel template "${name}" deleted.`);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Create New Reel Template from Modal
  const handleCreateReelTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplName.trim()) return;

    const newId = `tmpl_reel_${Date.now()}`;
    const selectedMusicObj = PRESET_MUSIC_TRACKS.find((m) => m.id === newTmplMusicPreset) || PRESET_MUSIC_TRACKS[0];

    const newTemplate: SigTemplate = {
      id: newId,
      name: newTmplName.trim(),
      templateType: 'reel',
      canvasWidth: 1080,
      canvasHeight: 1920,
      templateImageUrl: newTmplImageUrl.trim() || '',
      layerMode: 'overlay',
      backgroundColor: '#0B0F19',
      videoConfig: {
        enabled: true,
        durationSeconds: 15,
        effect: newTmplEffect,
        overlays: ['vignette'],
        musicUrl: selectedMusicObj.url,
        musicName: selectedMusicObj.name,
        musicVolume: 100,
        targetPlatforms: ['facebook', 'instagram', 'youtube'],
      },
      featuredImageBox: {
        x: 40,
        y: Math.round(1920 * 0.1),
        width: 1000,
        height: Math.round(1920 * 0.52),
        borderRadius: 24,
      },
      titleBox: {
        x: 60,
        y: Math.round(1920 * 0.65),
        width: 960,
        height: Math.round(1920 * 0.3),
        fontSize: 56,
        lineHeight: 1.35,
        textColor: '#FFFFFF',
        highlightColor: '#FACC15',
        fontFamily: 'Noto Sans Devanagari',
        alignment: 'center',
      },
    };

    saveSigTemplate(newTemplate);
    setSelectedTemplateId(newId);
    setIsNewModalOpen(false);
    setActiveTab('editor');
    setSaveMessage(`New 9:16 Reel template "${newTmplName}" created!`);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Audio Upload Handler
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setMusicUrl(data.url);
        setMusicName(file.name.replace(/\.[^/.]+$/, ''));
        setSaveMessage(`Custom audio "${file.name}" uploaded!`);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        alert(data.error || 'Audio upload failed.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload network error.');
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  // Toggle Audio Play / Pause
  const togglePlayAudio = (urlToPlay: string) => {
    if (!audioPreviewRef.current) return;

    if (isPlayingAudio && audioPreviewRef.current.src.includes(urlToPlay)) {
      audioPreviewRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPreviewRef.current.src = urlToPlay;
      audioPreviewRef.current.volume = Math.max(0.1, musicVolume / 100);
      audioPreviewRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Generate Reel Video Preview
  const handleGenerateReel = async () => {
    setIsGeneratingReel(true);
    setGeneratedVideoUrl(null);

    try {
      // Step 1: Render 9:16 Composite Card onto canvas
      const offscreenCanvas = document.createElement('canvas');
      const currentDraftTemplate: SigTemplate = {
        ...activeTemplate,
        name: templateName,
        canvasWidth,
        canvasHeight,
        templateImageUrl,
        backgroundColor,
        layerMode,
        featuredImageBox: fBox,
        titleBox: tBox,
      };

      const cardDataUrl = await renderTemplateToCanvas(offscreenCanvas, {
        template: currentDraftTemplate,
        headline: genHeadline,
        highlightPhrase: genHighlight,
        featuredImageUrl: genPhotoUrl,
      });

      // Step 2: Call /api/video/generate to render high-quality MP4 with motion & music
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: cardDataUrl,
          duration,
          effect,
          overlays: selectedOverlays,
          musicUrl,
          musicVolume,
          outputFilename: `reel_${activeTemplate.id}_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (data.success && data.videoUrl) {
        setGeneratedVideoUrl(data.videoUrl);
        setGeneratedVideoSize(data.sizeBytes);
      } else {
        alert(`Failed to render reel: ${data.error || 'Unknown error'}`);
      }
    } catch (err: unknown) {
      alert(`Network error rendering reel: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGeneratingReel(false);
    }
  };

  // Send to Composer
  const handleSendToComposer = () => {
    if (!generatedVideoUrl) return;
    sessionStorage.setItem('sap_pending_composer_video', generatedVideoUrl);
    sessionStorage.setItem('sap_pending_composer_text', genHeadline);
    router.push('/composer');
  };

  return (
    <AppShell>
      <div className="space-y-6 font-sans max-w-7xl pb-24 select-none animate-fade-in">
        {/* Hidden Audio Player for Previewing Beats */}
        <audio
          ref={audioPreviewRef}
          onEnded={() => setIsPlayingAudio(false)}
          onError={() => setIsPlayingAudio(false)}
          className="hidden"
        />

        {/* ── Top Header ── */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
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
              Create automated 9:16 Video Reels for Facebook Reels, Instagram &amp; YouTube Shorts. Select custom motion animations, multiple visual overlays, and category-tailored background beats (Cricket, Breaking News, Dharam/Bhakti).
            </p>
          </div>

          {/* Tab Switcher Pills */}
          <div className="relative z-10 flex items-center gap-1.5 bg-white/10 p-1.5 rounded-2xl border border-white/15 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              📋 Reel Templates ({reelTemplates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🎨 Visual Canvas (9:16)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('motion')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'motion'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              ✨ Motion &amp; Music
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('generator')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'generator'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🎬 Test Generator &amp; Player
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: REEL TEMPLATES DIRECTORY (9:16) */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'templates' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Saved 9:16 Reel Templates ({reelTemplates.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Each template configures unique layout cutouts, motion animations, and category background music.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Reel Template</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {reelTemplates.map((t) => {
                const isSelected = t.id === selectedTemplateId;
                const vConf = t.videoConfig || {};
                const currentEff = MOTION_EFFECTS.find((m) => m.id === vConf.effect) || MOTION_EFFECTS[0];

                return (
                  <div
                    key={t.id}
                    className={`bg-white rounded-3xl border p-4 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] transition-all flex flex-col justify-between space-y-3.5 ${
                      isSelected ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-[#EEF1F6]'
                    }`}
                  >
                    <div>
                      {/* 9:16 Mockup Preview Card */}
                      <div className="relative aspect-[9/14] rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/50 mb-3 group flex items-center justify-center">
                        {t.templateImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.templateImageUrl}
                            alt={t.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                              <Film className="w-6 h-6" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-300">
                              Full Screen 9:16 Reel
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {t.canvasWidth || 1080}×{t.canvasHeight || 1920}
                            </span>
                          </div>
                        )}

                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[10px] font-mono font-bold text-white">
                            {t.canvasWidth || 1080}×{t.canvasHeight || 1920}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-bold shadow-xs">
                            {vConf.durationSeconds || 15}s Reel
                          </span>
                          {t.isDefault && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-bold shadow-xs">
                              Default
                            </span>
                          )}
                        </div>

                        {/* Motion badge pill on preview */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-bold text-white bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10">
                          <span className="flex items-center gap-1">
                            <span>{currentEff.icon}</span>
                            <span>{currentEff.name}</span>
                          </span>
                          <span className="text-amber-400 font-mono">🎵 {vConf.musicName || 'Beat'}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-black text-sm text-slate-900 leading-snug line-clamp-1">
                          {t.name}
                        </h4>

                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-bold flex items-center gap-1">
                            <span>📸 Photo:</span>
                            <span>{t.featuredImageBox?.width || 0}×{t.featuredImageBox?.height || 0}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-bold flex items-center gap-1">
                            <span>📝 Text:</span>
                            <span>{t.titleBox?.width || 0}×{t.titleBox?.height || 0}</span>
                          </span>
                        </div>

                        {/* Overlays list */}
                        {vConf.overlays && vConf.overlays.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            <span className="text-[10px] text-slate-400 font-bold">Overlays:</span>
                            {vConf.overlays.map((ov) => {
                              const foundOv = VIDEO_OVERLAYS.find((o) => o.id === ov);
                              return (
                                <span
                                  key={ov}
                                  className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-bold border border-rose-200/80"
                                >
                                  {foundOv ? foundOv.name : ov}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-[#F0F2F6] flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(t.id);
                            setActiveTab('editor');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          <Layout className="w-3.5 h-3.5" />
                          <span>Visual Canvas</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(t.id);
                            setActiveTab('motion');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer transition-colors border border-rose-200"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Motion &amp; Beat</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(t.id);
                            setActiveTab('generator');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold cursor-pointer transition-colors border border-pink-200"
                          title="Generate test reel video"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Test</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(t.id, t.name)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold cursor-pointer transition-colors border border-red-200"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: VISUAL CANVAS EDITOR (9:16 VERTICAL REEL LAYOUT) */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'editor' && (
          <div className="space-y-4">
            {/* Editor Header Bar with Template Switcher */}
            <div className="bg-white rounded-2xl border border-[#EEF1F6] p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500">Active Reel Template:</span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleSwitchTemplateInEditor(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  {reelTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.canvasWidth}×{t.canvasHeight}) {t.isDefault ? '★ Default' : ''}
                    </option>
                  ))}
                </select>

                <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {canvasWidth}×{canvasHeight} (9:16)
                </span>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                  <Film className="w-3 h-3" />
                  <span>{duration}s Reel</span>
                </span>
              </div>

              <div className="flex items-center gap-2 self-end lg:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => editorFrameInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                  title="Upload or replace 9:16 PNG frame overlay"
                >
                  <Upload className="w-3.5 h-3.5 text-rose-600" />
                  <span>Upload PNG Frame</span>
                </button>
                <input
                  ref={editorFrameInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        if (dataUrl) setTemplateImageUrl(dataUrl);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => setActiveTab('motion')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tune Motion &amp; Audio</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCurrentReelTemplate}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Template</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* ── Left Column: 9:16 Vertical Reel Studio Workspace ── */}
              <div className="lg:col-span-8 flex flex-col space-y-3">
                {/* 1-Click Card Layout Presets Toolbar */}
                <div className="bg-white rounded-2xl border border-[#EEF1F6] p-3 flex flex-wrap items-center justify-between gap-2 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Layout className="w-3.5 h-3.5 text-rose-600" />
                      <span>9:16 Presets:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => applyFullCardPreset('topPhoto')}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 cursor-pointer"
                    >
                      📸 Top Photo + Bottom Headline
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFullCardPreset('topHeadline')}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 cursor-pointer"
                    >
                      📝 Top Headline + Center Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFullCardPreset('fullBleed')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold border border-slate-200 cursor-pointer"
                    >
                      🖼️ Full Screen 9:16 Photo
                    </button>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400">Align:</span>
                    <button
                      type="button"
                      onClick={() => alignActiveBox('centerX')}
                      className="px-2 py-1 rounded bg-[#F8F9FD] hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-[#EEF1F6] cursor-pointer"
                    >
                      Center X
                    </button>
                    <button
                      type="button"
                      onClick={() => alignActiveBox('centerY')}
                      className="px-2 py-1 rounded bg-[#F8F9FD] hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-[#EEF1F6] cursor-pointer"
                    >
                      Center Y
                    </button>
                    <button
                      type="button"
                      onClick={() => alignActiveBox('fullWidth')}
                      className="px-2 py-1 rounded bg-[#F8F9FD] hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-[#EEF1F6] cursor-pointer"
                    >
                      Full Width
                    </button>
                    <button
                      type="button"
                      onClick={() => alignActiveBox('snapTop')}
                      className="px-2 py-1 rounded bg-[#F8F9FD] hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-[#EEF1F6] cursor-pointer"
                    >
                      Snap Top
                    </button>
                    <button
                      type="button"
                      onClick={() => alignActiveBox('snapBottom')}
                      className="px-2 py-1 rounded bg-[#F8F9FD] hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-[#EEF1F6] cursor-pointer"
                    >
                      Snap Bottom
                    </button>
                  </div>
                </div>

                {/* Vertical Canvas Studio Area */}
                <div
                  ref={visualEditorContainerRef}
                  className="bg-slate-950/95 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[640px] overflow-hidden relative"
                  onMouseMove={handleMouseMoveCanvas}
                  onMouseUp={handleMouseUpCanvas}
                  onMouseLeave={handleMouseUpCanvas}
                >
                  {/* Interactive Box Positioning with REAL Layer Stack */}
                  <div
                    style={{
                      width: `${displayWidth}px`,
                      height: `${displayHeight}px`,
                      backgroundColor: backgroundColor && backgroundColor !== 'transparent' ? backgroundColor : '#0B0F19',
                      backgroundImage: `
                        linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
                        linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.05) 75%),
                        linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.05) 75%)
                      `,
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    }}
                    className="relative rounded-2xl shadow-2xl overflow-hidden border border-slate-700 select-none ring-1 ring-white/10"
                  >
                    {/* Floating HUD Coordinate Badge */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-3 py-1 rounded-full text-[10px] font-mono text-slate-200 shadow-lg pointer-events-none">
                      <span className={`font-bold flex items-center gap-1 ${activeBox === 'featured' ? 'text-cyan-400' : 'text-amber-400'}`}>
                        {activeBox === 'featured' ? '📸 Photo Cutout' : '📝 Headline Box'}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span>X: <strong className="text-white">{activeBox === 'featured' ? fBox.x : tBox.x}</strong></span>
                      <span>Y: <strong className="text-white">{activeBox === 'featured' ? fBox.y : tBox.y}</strong></span>
                      <span className="text-slate-600">•</span>
                      <span>W: <strong className="text-white">{activeBox === 'featured' ? fBox.width : tBox.width}</strong></span>
                      <span>H: <strong className="text-white">{activeBox === 'featured' ? fBox.height : tBox.height}</strong></span>
                    </div>

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
                        fontSize: `${Math.round((tBox.fontSize || 56) * displayScale)}px`,
                        lineHeight: tBox.lineHeight || 1.35,
                        fontFamily: `"${tBox.fontFamily || 'Noto Sans Devanagari'}", "Poppins", sans-serif`,
                        textAlign: tBox.alignment || 'center',
                        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                      }}
                      className="p-1 font-bold line-clamp-4"
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
                      <div className="bg-cyan-950/90 text-cyan-300 text-[9px] font-bold px-2 py-0.5 rounded shadow pointer-events-none flex items-center gap-1">
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
                      <div className="bg-amber-950/90 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded shadow pointer-events-none flex items-center gap-1">
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

                  {/* Canvas Footer Controls */}
                  <div className="mt-4 flex flex-wrap items-center justify-between w-full max-w-sm px-2 text-[11px] text-slate-400 font-medium gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>Cyan: Photo</span>
                      <span className="w-2 h-2 rounded-full bg-amber-400 ml-2" />
                      <span>Amber: Text</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDisplayScale((s) => Math.max(0.15, s - 0.05))}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs text-slate-300 w-10 text-center">
                        {Math.round(displayScale * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setDisplayScale((s) => Math.min(0.8, s + 0.05))}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Right Column: Precision Coordinates & Properties Panel ── */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EEF1F6] p-4 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4 text-xs">
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

                {/* Precision Coordinates Steppers */}
                <div className="space-y-2 pt-2 border-t border-[#EEF1F6]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                      <Move className="w-3.5 h-3.5 text-slate-400" />
                      <span>{activeBox === 'featured' ? 'Photo' : 'Headline'} Position &amp; Size</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">px</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono">
                    {/* X */}
                    <div className="bg-[#F8F9FD] p-2 rounded-xl border border-[#EEF1F6]">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-500 font-bold">X (Left)</label>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => adjustActiveBoxCoordinate('x', -10)}
                            className="px-1 py-0.5 rounded bg-white hover:bg-slate-200 text-[9px] font-bold border border-slate-200 text-slate-600 cursor-pointer"
                          >-10</button>
                          <button
                            type="button"
                            onClick={() => adjustActiveBoxCoordinate('x', 10)}
                            className="px-1 py-0.5 rounded bg-white hover:bg-slate-200 text-[9px] font-bold border border-slate-200 text-slate-600 cursor-pointer"
                          >+10</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustActiveBoxCoordinate('x', -1)}
                          className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={activeBox === 'featured' ? fBox.x : tBox.x}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (activeBox === 'featured') setFBox((p) => ({ ...p, x: val }));
                            else setTBox((p) => ({ ...p, x: val }));
                          }}
                          className="w-full text-center py-1 rounded bg-white border border-[#EEF1F6] text-xs font-bold text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => adjustActiveBoxCoordinate('x', 1)}
                          className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Y */}
                    <div className="bg-[#F8F9FD] p-2 rounded-xl border border-[#EEF1F6]">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-500 font-bold">Y (Top)</label>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => adjustActiveBoxCoordinate('y', -10)}
                            className="px-1 py-0.5 rounded bg-white hover:bg-slate-200 text-[9px] font-bold border border-slate-200 text-slate-600 cursor-pointer"
                          >-10</button>
                          <button
                            type="button"
                            onClick={() => adjustActiveBoxCoordinate('y', 10)}
                            className="px-1 py-0.5 rounded bg-white hover:bg-slate-200 text-[9px] font-bold border border-slate-200 text-slate-600 cursor-pointer"
                          >+10</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustActiveBoxCoordinate('y', -1)}
                          className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={activeBox === 'featured' ? fBox.y : tBox.y}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (activeBox === 'featured') setFBox((p) => ({ ...p, y: val }));
                            else setTBox((p) => ({ ...p, y: val }));
                          }}
                          className="w-full text-center py-1 rounded bg-white border border-[#EEF1F6] text-xs font-bold text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => adjustActiveBoxCoordinate('y', 1)}
                          className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Width */}
                    <div className="bg-[#F8F9FD] p-2 rounded-xl border border-[#EEF1F6]">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-500 font-bold">Width (W)</label>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => adjustActiveBoxCoordinate('width', -10)}
                            className="px-1 py-0.5 rounded bg-white hover:bg-slate-200 text-[9px] font-bold border border-slate-200 text-slate-600 cursor-pointer"
                          >-10</button>
                          <button
                            type="button"
                            onClick={() => adjustActiveBoxCoordinate('width', 10)}
                            className="px-1 py-0.5 rounded bg-white hover:bg-slate-200 text-[9px] font-bold border border-slate-200 text-slate-600 cursor-pointer"
                          >+10</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustActiveBoxCoordinate('width', -1)}
                          className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={activeBox === 'featured' ? fBox.width : tBox.width}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (activeBox === 'featured') setFBox((p) => ({ ...p, width: val }));
                            else setTBox((p) => ({ ...p, width: val }));
                          }}
                          className="w-full text-center py-1 rounded bg-white border border-[#EEF1F6] text-xs font-bold text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => adjustActiveBoxCoordinate('width', 1)}
                          className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Height */}
                    <div className="bg-[#F8F9FD] p-2 rounded-xl border border-[#EEF1F6]">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-500 font-bold">Height (H)</label>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => adjustActiveBoxCoordinate('height', -10)}
                            className="px-1 py-0.5 rounded bg-white hover:bg-slate-200 text-[9px] font-bold border border-slate-200 text-slate-600 cursor-pointer"
                          >-10</button>
                          <button
                            type="button"
                            onClick={() => adjustActiveBoxCoordinate('height', 10)}
                            className="px-1 py-0.5 rounded bg-white hover:bg-slate-200 text-[9px] font-bold border border-slate-200 text-slate-600 cursor-pointer"
                          >+10</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustActiveBoxCoordinate('height', -1)}
                          className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={activeBox === 'featured' ? fBox.height : tBox.height}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (activeBox === 'featured') setFBox((p) => ({ ...p, height: val }));
                            else setTBox((p) => ({ ...p, height: val }));
                          }}
                          className="w-full text-center py-1 rounded bg-white border border-[#EEF1F6] text-xs font-bold text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => adjustActiveBoxCoordinate('height', 1)}
                          className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Corner Radius & Styling */}
                {activeBox === 'featured' ? (
                  <div className="space-y-2 pt-2 border-t border-[#EEF1F6]">
                    <label className="text-[11px] font-bold text-slate-600 block">
                      Corner Radius ({fBox.borderRadius || 0}px)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={48}
                      value={fBox.borderRadius || 0}
                      onChange={(e) => setFBox((p) => ({ ...p, borderRadius: Number(e.target.value) }))}
                      className="w-full cursor-pointer accent-cyan-600"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-[#EEF1F6]">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">
                        Headline Font Size ({tBox.fontSize || 56}px)
                      </label>
                      <input
                        type="range"
                        min={32}
                        max={100}
                        value={tBox.fontSize || 56}
                        onChange={(e) => setTBox((p) => ({ ...p, fontSize: Number(e.target.value) }))}
                        className="w-full cursor-pointer accent-rose-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Text Color</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={tBox.textColor || '#FFFFFF'}
                            onChange={(e) => setTBox((p) => ({ ...p, textColor: e.target.value }))}
                            className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0"
                          />
                          <span className="font-mono text-[10px] font-bold text-slate-700">{tBox.textColor}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Highlight Color</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={tBox.highlightColor || '#FACC15'}
                            onChange={(e) => setTBox((p) => ({ ...p, highlightColor: e.target.value }))}
                            className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0"
                          />
                          <span className="font-mono text-[10px] font-bold text-slate-700">{tBox.highlightColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: MOTION EFFECTS, OVERLAYS & CATEGORY MUSIC */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'motion' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Animations & Overlays */}
            <div className="lg:col-span-8 space-y-6">
              {/* Section 1: Motion Animations */}
              <div className="bg-white rounded-3xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-rose-600" />
                      <span>Motion Animation Style</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Choose dynamic camera movement for this template. Runs continuously over the 9:16 reel.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                    Selected: {MOTION_EFFECTS.find((m) => m.id === effect)?.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {MOTION_EFFECTS.map((m) => {
                    const isSelected = effect === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setEffect(m.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? 'bg-rose-50/50 border-rose-500 ring-2 ring-rose-500/20'
                            : 'bg-white border-[#EEF1F6] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xl">{m.icon}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${m.badgeColor}`}>
                            {m.badge}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                            {m.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-snug mt-1">
                            {m.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Multi-Select Video Overlays */}
              <div className="bg-white rounded-3xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Multiple Video Overlays &amp; Textures</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Combine multiple cinematic overlays simultaneously (e.g. Red Alert + Vignette + Film Grain).
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                    {selectedOverlays.length} Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {VIDEO_OVERLAYS.map((ov) => {
                    const isChecked = selectedOverlays.includes(ov.id);
                    return (
                      <div
                        key={ov.id}
                        onClick={() => handleToggleOverlay(ov.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 select-none ${
                          isChecked
                            ? 'bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-500/20'
                            : 'bg-white border-[#EEF1F6] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{ov.icon}</span>
                          <span
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                            {ov.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-snug mt-1">
                            {ov.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Category Music Library & Duration */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Music className="w-4 h-4 text-pink-600" />
                    <span>Category Music Library</span>
                  </h3>
                  <label className="text-[10px] font-bold text-pink-600 hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Upload MP3</span>
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleAudioUpload}
                    />
                  </label>
                </div>

                {/* Preset Tracks List */}
                <div className="space-y-2">
                  {PRESET_MUSIC_TRACKS.map((t) => {
                    const isSelected = musicUrl === t.url;
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-rose-50/50 border-rose-500 ring-1 ring-rose-500/30'
                            : 'bg-white border-[#EEF1F6] hover:border-slate-200'
                        }`}
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setMusicUrl(t.url);
                            setMusicName(t.name);
                          }}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-black text-slate-900">{t.name}</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">{t.description}</p>
                        </div>

                        {/* Audio Preview Button */}
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(t.url)}
                          className="w-8 h-8 rounded-full bg-slate-900 hover:bg-black text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                          title="Listen to preview beat"
                        >
                          {isPlayingAudio && audioPreviewRef.current?.src.includes(t.url) ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Music Volume Slider */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Audio Volume:</span>
                    </span>
                    <span className="font-mono font-bold text-rose-600">{musicVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                    className="w-full cursor-pointer accent-rose-600"
                  />
                </div>

                {/* Duration Picker */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Reel Duration:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[10, 15, 30, 60].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          duration === d
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Motion Settings Button */}
                <button
                  type="button"
                  onClick={handleSaveCurrentReelTemplate}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95 text-white text-xs font-black cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Reel Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: TEST REEL GENERATOR & VIDEO PLAYER */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'generator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Test Controls */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-black text-slate-900 mb-0.5">
                  Generate Test 9:16 Video Reel
                </h3>
                <p className="text-[11px] text-slate-400">
                  Renders the template layout, applies selected motion animation, overlays, and cuts background music into an MP4 video.
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
                  {reelTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.canvasWidth}×{t.canvasHeight})
                    </option>
                  ))}
                </select>
              </div>

              {/* Headline */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Reel Headline (Hindi Title)
                </label>
                <textarea
                  rows={3}
                  value={genHeadline}
                  onChange={(e) => setGenHeadline(e.target.value)}
                  placeholder="Enter Hindi news headline..."
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
                  placeholder="Phrase to highlight..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs text-slate-900"
                />
              </div>

              {/* Featured Image */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 block">Featured Image</label>
                  <label className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1">
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
                            const dataUrl = ev.target?.result as string;
                            if (dataUrl) setGenPhotoUrl(dataUrl);
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
                  placeholder="Paste photo URL..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EEF1F6] bg-[#F8F9FD] text-xs font-mono truncate"
                />
              </div>

              {/* Active Settings Summary Pill */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-600 font-semibold">
                  <span>Effect:</span>
                  <strong className="text-slate-900">{MOTION_EFFECTS.find((m) => m.id === effect)?.name}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600 font-semibold">
                  <span>Audio:</span>
                  <strong className="text-slate-900">{musicName} ({musicVolume}%)</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600 font-semibold">
                  <span>Duration:</span>
                  <strong className="text-slate-900">{duration} seconds</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600 font-semibold">
                  <span>Overlays:</span>
                  <strong className="text-slate-900">{selectedOverlays.length} selected</strong>
                </div>
              </div>

              {/* Generate Reel Button */}
              <button
                type="button"
                onClick={handleGenerateReel}
                disabled={isGeneratingReel}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95 disabled:opacity-50 text-white text-xs font-black cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isGeneratingReel ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Rendering 9:16 Video Reel (FFmpeg)...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>Generate 9:16 Video Reel</span>
                  </>
                )}
              </button>
            </div>

            {/* Right 7 Cols: Mobile Frame Mockup & Video Player */}
            <div className="lg:col-span-7 bg-slate-950/95 rounded-3xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[580px] shadow-2xl relative">
              {generatedVideoUrl ? (
                <div className="flex flex-col items-center space-y-4 max-w-sm w-full animate-fade-in">
                  {/* Phone Mockup Frame */}
                  <div className="relative aspect-[9/16] w-full max-w-[280px] rounded-[36px] overflow-hidden border-4 border-slate-700 shadow-2xl bg-black">
                    <video
                      src={generatedVideoUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Metadata and Action Buttons */}
                  <div className="flex items-center justify-between w-full text-xs font-mono text-slate-400 px-2">
                    <span>Format: 1080×1920 MP4</span>
                    {generatedVideoSize && (
                      <span>Size: {(generatedVideoSize / 1024 / 1024).toFixed(2)} MB</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full">
                    <a
                      href={generatedVideoUrl}
                      download={`reel_${Date.now()}.mp4`}
                      className="flex-1 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download MP4</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleSendToComposer}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Send to Composer</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 space-y-3 max-w-sm">
                  <div className="w-16 h-16 rounded-3xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner">
                    <Film className="w-8 h-8" />
                  </div>
                  <h4 className="font-extrabold text-white text-sm">No Reel Rendered Yet</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enter your headline on the left and click <strong>Generate 9:16 Video Reel</strong> to render a preview with motion effects and background beat.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Add New Reel Template Modal ── */}
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-5 animate-scale-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">Create New 9:16 Reel Template</h3>
                    <p className="text-[11px] text-slate-400">Standard 1080×1920 vertical mobile reel format</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateReelTemplate} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Template Name</label>
                  <input
                    type="text"
                    required
                    value={newTmplName}
                    onChange={(e) => setNewTmplName(e.target.value)}
                    placeholder="e.g. Cricket Breaking News Reel or Dharam Bhakti Reel..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#F8F9FD] text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category Music Beat</label>
                  <select
                    value={newTmplMusicPreset}
                    onChange={(e) => setNewTmplMusicPreset(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#F8F9FD] text-xs font-bold"
                  >
                    {PRESET_MUSIC_TRACKS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.category} ({t.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Default Motion Animation</label>
                  <select
                    value={newTmplEffect}
                    onChange={(e) => setNewTmplEffect(e.target.value as VideoMotionEffect)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#F8F9FD] text-xs font-bold"
                  >
                    {MOTION_EFFECTS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.badge})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Transparent PNG Frame Overlay (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTmplImageUrl}
                    onChange={(e) => setNewTmplImageUrl(e.target.value)}
                    placeholder="Paste PNG URL or leave blank to start with clean layout..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#F8F9FD] text-xs font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-black hover:opacity-95 shadow-md cursor-pointer"
                  >
                    Create Template &amp; Open Canvas
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
