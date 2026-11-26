'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/context/app-context';
import { SigTemplate, VideoMotionEffect, VideoOverlayType } from '@/types';
import { INITIAL_REEL_TEMPLATES } from '@/lib/state/mock-data';
import { renderTemplateToCanvas } from '@/lib/services/image-compositor';

function getAspectRatioLabel(w: number, h: number): string {
  if (!w || !h) return '9:16 Reel';
  const ratio = w / h;
  if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16 Reel';
  if (Math.abs(ratio - 4 / 5) < 0.05) return '4:5 Portrait';
  if (Math.abs(ratio - 1) < 0.05) return '1:1 Square';
  if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9 Landscape';
  return `${w}×${h}`;
}
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
  ExternalLink,
  Minus,
  ZoomIn,
  ZoomOut,
  Eye,
  Settings,
  Sliders,
  CalendarClock,
  BookmarkCheck,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

// ── Built-in Animation Effects ──
const MOTION_EFFECTS: Array<{
  id: VideoMotionEffect;
  name: string;
  icon: string;
  badge: string;
  badgeColor: string;
  description: string;
  isNew?: boolean;
}> = [
  {
    id: 'subtle_float',
    name: 'Gentle Breathing Drift',
    icon: '🍃',
    badge: 'Ultra Smooth',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Slow, peaceful breathing float. Leaves news headlines 100% crisp, stable and readable.',
    isNew: true,
  },
  {
    id: 'micro_jitter',
    name: 'Micro Handheld Tremble',
    icon: '📱',
    badge: 'Handheld Cam',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Extremely gentle micro-camera movement (1-2px). Gives an authentic organic camera feel without text blurring.',
    isNew: true,
  },
  {
    id: 'smooth_sway',
    name: 'Smooth Cinematic Sway',
    icon: '↔️',
    badge: 'Cinematic Drift',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Slow horizontal camera pan swaying gently back and forth.',
    isNew: true,
  },
  {
    id: 'vertical_drift',
    name: 'Vertical Floating Bob',
    icon: '↕️',
    badge: 'Gentle Float',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Very slow vertical bobbing motion, like a soft breathing camera crane.',
    isNew: true,
  },
  {
    id: 'pulse_shake',
    name: 'Rhythmic Heartbeat Pulse',
    icon: '💓',
    badge: 'Rhythmic Alert',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
    description: 'Gentle heartbeat breathing pulse with subtle micro-shake to hook attention.',
    isNew: true,
  },
  {
    id: 'shake',
    name: 'Mild Camera Shake',
    icon: '⚡',
    badge: 'Breaking News',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Calibrated impact shake (calm amplitude). Alert vibe while keeping headlines readable.',
  },
  {
    id: 'breaking_jitter',
    name: 'Alert Flash Jitter',
    icon: '💥',
    badge: 'Urgent Alert',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Subtle alert strobe jitter with periodic brightness flash for major news.',
  },
  {
    id: 'zoom_in',
    name: 'Slow Zoom In',
    icon: '🔍',
    badge: 'Ken Burns',
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
    id: 'glitter',
    name: 'Ambient Light Shimmer',
    icon: '✨',
    badge: 'Warm Shimmer',
    badgeColor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    description: 'Warm shimmering light pulses and sparkling glow for festive & cultural news.',
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

// ── Multi-select Video Overlays (Atmospheric Particles, Dust, Snow, Glitter) ──
const VIDEO_OVERLAYS: Array<{
  id: VideoOverlayType;
  name: string;
  icon: string;
  badge: string;
  badgeColor: string;
  description: string;
}> = [
  {
    id: 'particle_snow',
    name: 'Delicate Snow Flakes',
    icon: '❄️',
    badge: 'Winter / Calm',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Soft falling white snowflakes with gentle horizontal drift.',
  },
  {
    id: 'floating_dust',
    name: 'Cinematic Floating Dust',
    icon: '✨',
    badge: 'Atmospheric Dust',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Cinematic floating dust motes & gentle micro light particles.',
  },
  {
    id: 'glitter_sparkle',
    name: 'Golden Star Sparkles',
    icon: '⭐',
    badge: 'Diamond Sparkle',
    badgeColor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    description: 'Sparkling diamond and golden stars shimmering across the card.',
  },
  {
    id: 'bokeh_lights',
    name: 'Floating Bokeh Orbs',
    icon: '🔮',
    badge: 'Glowing Bokeh',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Soft glowing ambient translucent light orbs drifting upward.',
  },
  {
    id: 'fire_embers',
    name: 'Warm Glowing Embers',
    icon: '🔥',
    badge: 'Rising Embers',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Warm rising sparks and glowing embers with orange-red warmth.',
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
    name: 'Vintage 35mm Film Grain',
    icon: '🎞️',
    badge: 'Cinema Texture',
    badgeColor: 'bg-stone-50 text-stone-700 border-stone-200',
    description: 'Subtle high-end 35mm motion film noise for an authentic cinema look.',
  },
];

// ── Preset Category-Specific Music Tracks (Studio Quality) ──
const PRESET_MUSIC_TRACKS = [
  {
    id: 'breaking',
    name: 'Breaking News Studio Beat',
    category: '🔴 Breaking News',
    badge: 'Studio Broadcast',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    url: '/uploads/audio/v2_breaking_news.mp3',
    description: 'Modern broadcast news groove with crisp driving bass & studio punch.',
  },
  {
    id: 'epic_drums',
    name: 'Epic Breaking News Drums',
    category: '🔴 Urgent Headline',
    badge: 'Impactful Drums',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    url: '/uploads/audio/v2_epic_drums.mp3',
    description: 'Bold theatrical percussion & dramatic build-up for major headline alerts.',
  },
  {
    id: 'cricket',
    name: 'Cricket & Sports Highlights',
    category: '🏏 Cricket & Sports',
    badge: 'Stadium Action',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    url: '/uploads/audio/v2_sports_cricket.mp3',
    description: 'Upbeat stadium energy, punchy synth groove, and match highlights vibe.',
  },
  {
    id: 'devotional',
    name: 'Dharam & Spiritual Ambient',
    category: '🕉️ Dharam / Bhakti',
    badge: 'Peaceful / Temple',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    url: '/uploads/audio/v2_devotional_spiritual.mp3',
    description: 'Warm celestial pads and serene meditative atmosphere for devotional stories.',
  },
  {
    id: 'peaceful',
    name: 'Calm Acoustic Serenity',
    category: '🌿 Wellness / Positive',
    badge: 'Soft & Soothing',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    url: '/uploads/audio/v2_peaceful_valley.mp3',
    description: 'Gentle melodic acoustic texture ideal for feel-good and inspiring reels.',
  },
  {
    id: 'crime',
    name: 'Crime & Mystery Suspense',
    category: '🚨 Crime & Mystery',
    badge: 'Dark Thriller',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    url: '/uploads/audio/v2_crime_suspense.mp3',
    description: 'Deep cinematic suspense underscore with atmospheric tension for crime news.',
  },
  {
    id: 'viral',
    name: 'Trending Chill Lo-Fi',
    category: '📈 Viral & Lifestyle',
    badge: 'Modern Lo-Fi',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    url: '/uploads/audio/v2_viral_lofi.mp3',
    description: 'Smooth warm lo-fi hip-hop groove with crisp chill drums for viral reels.',
  },
  {
    id: 'urban',
    name: 'Deep Urban Tech Groove',
    category: '⚡ Tech & Business',
    badge: 'Sleek Electronic',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    url: '/uploads/audio/v2_tech_urban.mp3',
    description: 'Clean modern electronic pulse ideal for tech, business & explainer reels.',
  },
];

// ── Real-time Interactive Particle System Component for Live Overlays ──
function ReelParticleOverlay({
  width,
  height,
  selectedOverlays,
  overlayIntensity = 50,
}: {
  width: number;
  height: number;
  selectedOverlays: VideoOverlayType[];
  overlayIntensity: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const intensity = Math.max(0.1, Math.min(1.0, overlayIntensity / 100));

    const hasSnow = selectedOverlays.includes('particle_snow');
    const hasDust = selectedOverlays.includes('floating_dust') || selectedOverlays.includes('particles');
    const hasGlitter = selectedOverlays.includes('glitter_sparkle');
    const hasBokeh = selectedOverlays.includes('bokeh_lights');
    const hasEmbers = selectedOverlays.includes('fire_embers');

    if (!hasSnow && !hasDust && !hasGlitter && !hasBokeh && !hasEmbers) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    interface PItem {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      alphaSpeed: number;
      type: 'snow' | 'dust' | 'glitter' | 'bokeh' | 'ember';
      color: string;
      phase: number;
      rot: number;
      rotSpeed: number;
      depth: number;
    }

    const particles: PItem[] = [];

    if (hasSnow) {
      const count = Math.round(14 + 42 * intensity);
      for (let i = 0; i < count; i++) {
        const depth = 0.4 + Math.random() * 0.6;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45 * depth,
          vy: (0.45 + Math.random() * 1.1) * depth,
          size: (1.2 + Math.random() * 2.6) * depth,
          alpha: 0.35 + Math.random() * 0.55,
          alphaSpeed: 0.01,
          type: 'snow',
          color: '#FFFFFF',
          phase: Math.random() * Math.PI * 2,
          rot: 0,
          rotSpeed: 0,
          depth,
        });
      }
    }

    if (hasDust) {
      const count = Math.round(14 + 54 * intensity);
      for (let i = 0; i < count; i++) {
        const isBokehDust = Math.random() > 0.72;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -0.18 - Math.random() * 0.38,
          size: isBokehDust ? 2.4 + Math.random() * 2.6 : 0.9 + Math.random() * 1.7,
          alpha: isBokehDust ? 0.22 + Math.random() * 0.28 : 0.35 + Math.random() * 0.5,
          alphaSpeed: 0.012 + Math.random() * 0.014,
          type: 'dust',
          color: Math.random() > 0.38 ? 'gold' : 'white',
          phase: Math.random() * Math.PI * 2,
          rot: 0,
          rotSpeed: 0,
          depth: isBokehDust ? 1.2 : 0.8,
        });
      }
    }

    if (hasGlitter) {
      const count = Math.round(7 + 20 * intensity);
      for (let i = 0; i < count; i++) {
        const isHeroStar = Math.random() > 0.45;
        particles.push({
          x: 12 + Math.random() * (width - 24),
          y: 12 + Math.random() * (height - 24),
          vx: (Math.random() - 0.5) * 0.14,
          vy: -0.08 - Math.random() * 0.14,
          size: (isHeroStar ? 4.0 + Math.random() * 4.2 : 2.2 + Math.random() * 2.4) * (0.75 + 0.35 * intensity),
          alpha: Math.random() * Math.PI * 2, // phase angle for smooth twinkle
          alphaSpeed: 0.032 + Math.random() * 0.038,
          type: 'glitter',
          color: Math.random() > 0.3 ? 'gold' : 'white',
          phase: Math.random() * Math.PI * 2,
          rot: (Math.random() - 0.5) * 0.35,
          rotSpeed: (Math.random() - 0.5) * 0.008,
          depth: 1,
        });
      }
    }

    if (hasBokeh) {
      const count = Math.round(4 + 12 * intensity);
      const bokehColors = [
        'rgba(253, 224, 71, ',
        'rgba(244, 114, 182, ',
        'rgba(251, 146, 60, ',
        'rgba(167, 139, 250, ',
      ];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.22,
          vy: -0.22 - Math.random() * 0.42,
          size: 9 + Math.random() * 20,
          alpha: 0.09 + Math.random() * 0.14,
          alphaSpeed: 0.004,
          type: 'bokeh',
          color: bokehColors[i % bokehColors.length],
          phase: Math.random() * Math.PI * 2,
          rot: 0,
          rotSpeed: 0,
          depth: 1,
        });
      }
    }

    if (hasEmbers) {
      const count = Math.round(10 + 30 * intensity);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.65,
          vy: -0.9 - Math.random() * 1.4,
          size: 1.4 + Math.random() * 2.4,
          alpha: 0.45 + Math.random() * 0.5,
          alphaSpeed: 0.012 + Math.random() * 0.01,
          type: 'ember',
          color: Math.random() > 0.35 ? 'amber' : 'red',
          phase: Math.random() * Math.PI * 2,
          rot: 0,
          rotSpeed: 0,
          depth: 1,
        });
      }
    }

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -24) p.x = width + 24;
        if (p.x > width + 24) p.x = -24;
        if (p.y < -30) p.y = height + 20;
        if (p.y > height + 30) p.y = -20;

        if (p.type === 'snow') {
          p.x += Math.sin((frame + p.phase * 50) * 0.025) * 0.35 * p.depth;
          const a = Math.min(0.95, p.alpha * (0.45 + 0.55 * intensity));
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.7);
          grad.addColorStop(0, `rgba(255, 255, 255, ${a})`);
          grad.addColorStop(0.55, `rgba(241, 245, 249, ${(a * 0.55).toFixed(2)})`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.7, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else if (p.type === 'dust') {
          p.x += Math.sin(frame * 0.018 + p.phase) * 0.25 + Math.cos(frame * 0.011 + p.phase * 2) * 0.14;
          const breath = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(frame * p.alphaSpeed + p.phase));
          const a = Math.min(0.92, p.alpha * breath * (0.4 + 0.6 * intensity));
          const rGlow = p.size * 2.2;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rGlow);
          if (p.color === 'gold') {
            grad.addColorStop(0, `rgba(255, 251, 235, ${a})`);
            grad.addColorStop(0.35, `rgba(253, 230, 138, ${(a * 0.72).toFixed(2)})`);
            grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          } else {
            grad.addColorStop(0, `rgba(255, 255, 255, ${a})`);
            grad.addColorStop(0.45, `rgba(226, 232, 240, ${(a * 0.52).toFixed(2)})`);
            grad.addColorStop(1, 'rgba(203, 213, 225, 0)');
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, rGlow, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else if (p.type === 'glitter') {
          p.alpha += p.alphaSpeed;
          p.rot += p.rotSpeed;
          const wave = Math.pow(0.5 + 0.5 * Math.sin(p.alpha), 2.2);
          const currentA = Math.min(0.98, (0.08 + 0.92 * wave) * (0.45 + 0.55 * intensity));
          const s = p.size * (0.65 + 0.5 * wave);
          const w = s * 0.05;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);

          // Soft optical radial aura glow
          const auraR = s * 1.45;
          const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, auraR);
          if (p.color === 'gold') {
            aura.addColorStop(0, `rgba(255, 255, 255, ${currentA})`);
            aura.addColorStop(0.28, `rgba(254, 240, 138, ${(currentA * 0.65).toFixed(2)})`);
            aura.addColorStop(0.65, `rgba(250, 204, 21, ${(currentA * 0.18).toFixed(2)})`);
          } else {
            aura.addColorStop(0, `rgba(255, 255, 255, ${currentA})`);
            aura.addColorStop(0.32, `rgba(224, 242, 254, ${(currentA * 0.6).toFixed(2)})`);
            aura.addColorStop(0.7, `rgba(147, 197, 253, ${(currentA * 0.15).toFixed(2)})`);
          }
          aura.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.beginPath();
          ctx.arc(0, 0, auraR, 0, Math.PI * 2);
          ctx.fillStyle = aura;
          ctx.fill();

          // Slender concave 4-point primary rays (razor-sharp delicate tips)
          ctx.fillStyle = p.color === 'gold'
            ? `rgba(254, 249, 195, ${currentA})`
            : `rgba(255, 255, 255, ${currentA})`;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.quadraticCurveTo(w, -w, s, 0);
          ctx.quadraticCurveTo(w, w, 0, s);
          ctx.quadraticCurveTo(-w, w, -s, 0);
          ctx.quadraticCurveTo(-w, -w, 0, -s);
          ctx.fill();

          // 45-degree diagonal secondary shimmer cross
          const s2 = s * 0.45;
          const w2 = w * 0.55;
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = p.color === 'gold'
            ? `rgba(253, 224, 71, ${(currentA * 0.72).toFixed(2)})`
            : `rgba(224, 242, 254, ${(currentA * 0.72).toFixed(2)})`;
          ctx.beginPath();
          ctx.moveTo(0, -s2);
          ctx.quadraticCurveTo(w2, -w2, s2, 0);
          ctx.quadraticCurveTo(w2, w2, 0, s2);
          ctx.quadraticCurveTo(-w2, w2, -s2, 0);
          ctx.quadraticCurveTo(-w2, -w2, 0, -s2);
          ctx.fill();

          // Hot pinpoint white core
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.8, s * 0.15), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${currentA})`;
          ctx.fill();

          ctx.restore();
        } else if (p.type === 'bokeh') {
          p.alpha += Math.sin(frame * 0.02 + p.phase) * 0.002;
          const currentA = Math.max(0.05, Math.min(0.32, p.alpha)) * (0.4 + 0.6 * intensity);
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grad.addColorStop(0, `${p.color}${(currentA * 0.45).toFixed(2)})`);
          grad.addColorStop(0.75, `${p.color}${(currentA * 0.78).toFixed(2)})`);
          grad.addColorStop(0.9, `${p.color}${(currentA * 0.95).toFixed(2)})`);
          grad.addColorStop(1, `${p.color}0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else if (p.type === 'ember') {
          p.x += Math.sin((frame + p.phase * 40) * 0.055) * 0.55;
          p.alpha -= p.alphaSpeed;
          if (p.alpha <= 0.1) {
            p.alpha = 0.85;
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          const a = Math.min(0.95, p.alpha * (0.45 + 0.55 * intensity));
          const tilt = Math.atan2(p.vx, -p.vy) * 0.6;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(tilt);

          const eGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2.8);
          eGlow.addColorStop(0, `rgba(254, 240, 138, ${a})`);
          eGlow.addColorStop(
            0.45,
            p.color === 'amber' ? `rgba(249, 115, 22, ${(a * 0.7).toFixed(2)})` : `rgba(239, 68, 68, ${(a * 0.65).toFixed(2)})`
          );
          eGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 2.2, p.size * 3.4, 0, 0, Math.PI * 2);
          ctx.fillStyle = eGlow;
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.65, p.size * 1.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(254, 249, 195, ${a})`;
          ctx.fill();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [width, height, selectedOverlays, overlayIntensity]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full pointer-events-none z-15"
    />
  );
}

// ── Real-time Live UI Preview with Phone Frame Mockup ──
function ReelLiveMockupPreview({
  canvasWidth,
  canvasHeight,
  templateImageUrl,
  layerMode = 'overlay',
  backgroundColor = '#0B0F19',
  fBox,
  tBox,
  headline,
  highlight,
  photoUrl,
  selectedEffects,
  motionIntensity = 20,
  selectedOverlays,
  overlayIntensity = 50,
  isLiveMotionPlaying,
  onToggleMotion,
  onGoToGenerator,
}: {
  canvasWidth: number;
  canvasHeight: number;
  templateImageUrl?: string;
  layerMode?: 'overlay' | 'background';
  backgroundColor?: string;
  fBox: { x: number; y: number; width: number; height: number; borderRadius?: number };
  tBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize?: number;
    textColor?: string;
    highlightColor?: string;
    alignment?: 'left' | 'center' | 'right';
  };
  headline: string;
  highlight?: string;
  photoUrl?: string;
  selectedEffects: VideoMotionEffect[];
  motionIntensity: number;
  selectedOverlays: VideoOverlayType[];
  overlayIntensity: number;
  isLiveMotionPlaying: boolean;
  onToggleMotion?: () => void;
  onGoToGenerator?: () => void;
}) {
  const maxW = 280;
  const maxH = 500;
  const scale = Math.min(maxW / canvasWidth, maxH / canvasHeight);
  const dispW = Math.round(canvasWidth * scale);
  const dispH = Math.round(canvasHeight * scale);

  const mi = Math.max(0.05, Math.min(1.0, (motionIntensity || 20) / 100));
  const ovI = Math.max(0.1, Math.min(1.0, (overlayIntensity || 50) / 100));

  const nonNoneEffects = selectedEffects.filter((e) => e !== 'none');
  const activeEffect = nonNoneEffects[0] || 'none';

  // Split spatial zoom/float/sway (outer wrapper) from shake/pulse/glitter (inner wrapper) so multiple effects combine!
  let outerAnim = 'none';
  let innerAnim = 'none';

  if (isLiveMotionPlaying && nonNoneEffects.length > 0) {
    if (nonNoneEffects.includes('zoom_in')) outerAnim = 'liveZoomIn 9s ease-out infinite alternate';
    else if (nonNoneEffects.includes('zoom_out')) outerAnim = 'liveZoomOut 9s ease-out infinite alternate';
    else if (nonNoneEffects.includes('smooth_sway')) outerAnim = 'liveSmoothSway 4.2s ease-in-out infinite';
    else if (nonNoneEffects.includes('vertical_drift')) outerAnim = 'liveVerticalDrift 4.4s ease-in-out infinite';
    else if (nonNoneEffects.includes('subtle_float')) outerAnim = 'liveSubtleFloat 4.2s ease-in-out infinite';

    if (nonNoneEffects.includes('breaking_jitter')) innerAnim = 'liveBreakingJitter 0.75s ease-in-out infinite';
    else if (nonNoneEffects.includes('shake')) innerAnim = 'liveShake 1.4s ease-in-out infinite';
    else if (nonNoneEffects.includes('micro_jitter')) innerAnim = 'liveMicroJitter 0.9s ease-in-out infinite';
    else if (nonNoneEffects.includes('pulse_shake')) innerAnim = 'livePulseShake 1.6s ease-in-out infinite';
    else if (nonNoneEffects.includes('glitter')) innerAnim = 'liveGlitterShimmer 1.8s ease-in-out infinite';
    else if (outerAnim === 'none' && nonNoneEffects.includes('subtle_float')) {
      innerAnim = 'liveSubtleFloat 4.2s ease-in-out infinite';
    }
  }

  const dynamicMotionVars: React.CSSProperties = {
    ['--float-x' as any]: `${(2.5 + 8.5 * mi).toFixed(2)}px`,
    ['--float-y' as any]: `${(3.5 + 11.5 * mi).toFixed(2)}px`,
    ['--sway-x' as any]: `${(4.5 + 15.5 * mi).toFixed(2)}px`,
    ['--sway-rot' as any]: `${(0.2 + 0.9 * mi).toFixed(2)}deg`,
    ['--drift-y' as any]: `${(4.5 + 15.5 * mi).toFixed(2)}px`,
    ['--jitter-x' as any]: `${(1.2 + 5.0 * mi).toFixed(2)}px`,
    ['--jitter-y' as any]: `${(1.2 + 5.0 * mi).toFixed(2)}px`,
    ['--shake-x' as any]: `${(2.5 + 9.0 * mi).toFixed(2)}px`,
    ['--shake-y' as any]: `${(2.0 + 7.5 * mi).toFixed(2)}px`,
    ['--zoom-max' as any]: `${(1.03 + 0.14 * mi).toFixed(3)}`,
    ['--pulse-max' as any]: `${(1.012 + 0.045 * mi).toFixed(3)}`,
    ['--glitter-bright' as any]: `${(1.04 + 0.14 * mi).toFixed(2)}`,
    ['--glitter-sat' as any]: `${(1.08 + 0.28 * mi).toFixed(2)}`,
  };

  const cleanHeadline = headline || 'सुक्खू सरकार का बड़ा फैसला : हिमकेयर बंद, अब मिलेगा ₹10 लाख तक फ्री इलाज!';
  const cleanHighlight = highlight?.trim() || '';
  const hasHighlight = cleanHighlight && cleanHeadline.includes(cleanHighlight);

  return (
    <div className="bg-slate-950/95 rounded-3xl border border-slate-800 p-5 shadow-2xl flex flex-col items-center space-y-4">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between w-full text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-extrabold text-white text-[11px] tracking-wide uppercase">
            Live Preview
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {canvasWidth}×{canvasHeight}
          </span>
          <button
            type="button"
            onClick={onToggleMotion}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
              isLiveMotionPlaying
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle live camera motion in preview"
          >
            {isLiveMotionPlaying ? '⏸️ Motion On' : '▶️ Motion Off'}
          </button>
        </div>
      </div>

      {/* Phone Frame Mockup */}
      <div
        style={{ width: dispW + 16, minHeight: dispH + 16 }}
        className="rounded-[32px] p-2 bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col items-center justify-center relative select-none"
      >
        {/* Device Top Speaker Notch */}
        <div className="w-16 h-3 bg-black rounded-full mb-1 border border-slate-800 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-slate-900 mr-2" />
          <div className="w-6 h-1 rounded-full bg-slate-800" />
        </div>

        {/* Scaled Preview Screen */}
        <div
          style={{
            width: dispW,
            height: dispH,
            backgroundColor: backgroundColor || '#0B0F19',
          }}
          className="relative rounded-[22px] overflow-hidden border border-slate-800/80 shadow-inner group"
        >
          {/* Outer Spatial Motion Wrapper (Zoom / Sway / Float) */}
          <div
            style={{
              ...dynamicMotionVars,
              width: '100%',
              height: '100%',
              position: 'relative',
              animation: outerAnim,
              transformOrigin: 'center center',
            }}
          >
            {/* Inner Secondary Motion Wrapper (Pulse / Shake / Jitter / Shimmer) */}
            <div
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                animation: innerAnim,
                transformOrigin: 'center center',
              }}
            >
            {/* LAYER 1: Photo (Z=1 if overlay, Z=2 if background) */}
            {photoUrl && (
              <div
                style={{
                  position: 'absolute',
                  left: `${Math.round(fBox.x * scale)}px`,
                  top: `${Math.round(fBox.y * scale)}px`,
                  width: `${Math.round(fBox.width * scale)}px`,
                  height: `${Math.round(fBox.height * scale)}px`,
                  borderRadius: `${Math.round((fBox.borderRadius || 0) * scale)}px`,
                  backgroundImage: `url(${photoUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: layerMode === 'overlay' ? 1 : 2,
                }}
                className="overflow-hidden"
              />
            )}

            {/* LAYER 2: Template PNG Frame (Z=2 if overlay, Z=1 if background) */}
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

            {/* LAYER 3: Headline Text */}
            <div
              style={{
                position: 'absolute',
                left: `${Math.round(tBox.x * scale)}px`,
                top: `${Math.round(tBox.y * scale)}px`,
                width: `${Math.round(tBox.width * scale)}px`,
                height: `${Math.round(tBox.height * scale)}px`,
                zIndex: 3,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  tBox.alignment === 'center'
                    ? 'center'
                    : tBox.alignment === 'right'
                    ? 'flex-end'
                    : 'flex-start',
                textAlign: (tBox.alignment || 'center') as any,
              }}
            >
              <p
                style={{
                  fontSize: `${Math.max(10, Math.round((tBox.fontSize || 56) * scale))}px`,
                  lineHeight: 1.3,
                  color: tBox.textColor || '#FFFFFF',
                  fontFamily: 'Noto Sans Devanagari, sans-serif',
                  fontWeight: 800,
                  textShadow: '0 2px 8px rgba(0,0,0,0.95)',
                }}
                className="leading-tight select-none"
              >
                {hasHighlight ? (
                  <>
                    {cleanHeadline.split(cleanHighlight).map((chunk, idx, arr) => (
                      <React.Fragment key={idx}>
                        {chunk}
                        {idx < arr.length - 1 && (
                          <span style={{ color: tBox.highlightColor || '#FACC15' }}>
                            {cleanHighlight}
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </>
                ) : (
                  cleanHeadline
                )}
              </p>
            </div>
          </div>
          </div>

          {/* LAYER 4: Real-time Live Particle Overlays */}
          <ReelParticleOverlay
            width={dispW}
            height={dispH}
            selectedOverlays={selectedOverlays}
            overlayIntensity={overlayIntensity}
          />

          {/* Vignette Overlay (if selected, scales dynamically with overlayIntensity) */}
          {selectedOverlays.includes('vignette') && (
            <div
              className="absolute inset-0 pointer-events-none z-16 transition-all duration-200"
              style={{
                background: `radial-gradient(circle at center, transparent 42%, rgba(2,4,8,${(0.24 + 0.62 * ovI).toFixed(2)}) 100%)`,
              }}
            />
          )}

          {/* Film Grain (if selected, scales dynamically with overlayIntensity) */}
          {selectedOverlays.includes('film_grain') && (
            <div
              className="absolute inset-0 pointer-events-none z-16 mix-blend-overlay transition-opacity duration-200"
              style={{
                opacity: Number((0.08 + 0.32 * ovI).toFixed(2)),
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />
          )}
        </div>
      </div>

      {/* Summary Footer & Quick Action */}
      <div className="w-full space-y-2 text-center">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
          <span>Motion: {activeEffect.replace('_', ' ')} ({motionIntensity}%)</span>
          <span>Overlays: {selectedOverlays.length} ({overlayIntensity}%)</span>
        </div>

        {onGoToGenerator && (
          <button
            type="button"
            onClick={onGoToGenerator}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Generate &amp; Play MP4 Video</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ReelStudioPage() {
  const router = useRouter();
  const { reelTemplates, saveReelTemplate, deleteReelTemplate } = useApp();

  // Active top-level tab: 'templates' | 'editor' | 'motion' | 'generator'
  const [activeTab, setActiveTab] = useState<'templates' | 'editor' | 'motion' | 'generator'>('templates');

  // Selected template id
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    reelTemplates[0]?.id || 'tmpl_reel_breaking'
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
      reelTemplates[0] ||
      INITIAL_REEL_TEMPLATES[0] || {
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
          verticalAlignment: 'center',
        },
        isDefault: false,
      }
    );
  }, [reelTemplates, selectedTemplateId]);

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
      verticalAlignment: 'center',
    }
  );

  // Active box in visual editor
  const [activeBox, setActiveBox] = useState<'featured' | 'title'>('featured');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Reel template saved successfully!');

  // ── Motion & Music Config State ──
  const [selectedEffects, setSelectedEffects] = useState<VideoMotionEffect[]>(
    activeTemplate.videoConfig?.effects || [activeTemplate.videoConfig?.effect || 'shake']
  );
  const [effect, setEffect] = useState<VideoMotionEffect>(
    activeTemplate.videoConfig?.effect || 'shake'
  );
  const [effectDuration, setEffectDuration] = useState<number>(
    activeTemplate.videoConfig?.effectDurationSeconds || activeTemplate.videoConfig?.durationSeconds || 15
  );
  const [duration, setDuration] = useState<number>(
    activeTemplate.videoConfig?.durationSeconds || 15
  );
  const [selectedOverlays, setSelectedOverlays] = useState<VideoOverlayType[]>(
    activeTemplate.videoConfig?.overlays || ['floating_dust']
  );
  const [motionIntensity, setMotionIntensity] = useState<number>(
    activeTemplate.videoConfig?.motionIntensity ?? 20
  );
  const [overlayIntensity, setOverlayIntensity] = useState<number>(
    activeTemplate.videoConfig?.overlayIntensity ?? 50
  );
  const [isLiveMotionPlaying, setIsLiveMotionPlaying] = useState<boolean>(true);
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
  const [lastRenderedCardUrl, setLastRenderedCardUrl] = useState<string | null>(null);

  // ── Reel Player State ──
  const reelVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlayingReel, setIsPlayingReel] = useState(false);
  const [isMutedReel, setIsMutedReel] = useState(true);
  const [reelProgress, setReelProgress] = useState(0);
  const [reelCurrentTime, setReelCurrentTime] = useState(0);
  const [reelTotalDuration, setReelTotalDuration] = useState(0);
  const [showNativeControls, setShowNativeControls] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);

  // Auto-init and load reel video element whenever a new video reel is generated
  useEffect(() => {
    if (reelVideoRef.current && generatedVideoUrl) {
      setVideoLoadError(false);
      const vid = reelVideoRef.current;
      vid.defaultMuted = true;
      vid.muted = isMutedReel;
      vid
        .play()
        .then(() => setIsPlayingReel(true))
        .catch(() => {
          vid.muted = true;
          setIsMutedReel(true);
          vid.play().then(() => setIsPlayingReel(true)).catch(() => setIsPlayingReel(false));
        });
    }
  }, [generatedVideoUrl]);

  // ── New Reel Template Modal ──
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplWidth, setNewTmplWidth] = useState(1080);
  const [newTmplHeight, setNewTmplHeight] = useState(1920);
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
          ? {
              ...target.titleBox,
              verticalAlignment: target.titleBox.verticalAlignment || 'center',
            }
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
              verticalAlignment: 'center',
            }
      );

      // Video config
      const vConf = target.videoConfig || {};
      const effs = vConf.effects || (vConf.effect ? [vConf.effect] : ['shake']);
      setSelectedEffects(effs);
      setEffect(vConf.effect || effs[0] || 'shake');
      setDuration(vConf.durationSeconds || 15);
      setEffectDuration(vConf.effectDurationSeconds || vConf.durationSeconds || 15);
      setSelectedOverlays(vConf.overlays || ['floating_dust']);
      setMotionIntensity(vConf.motionIntensity ?? 20);
      setOverlayIntensity(vConf.overlayIntensity ?? 50);
      setMusicUrl(vConf.musicUrl || '/uploads/audio/breaking_news_beat.mp3');
      setMusicName(vConf.musicName || 'Breaking News Beat');
      setMusicVolume(vConf.musicVolume ?? 100);
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

  // Toggle Motion Animation Effect selection (multi-select)
  const handleToggleEffect = (effId: VideoMotionEffect) => {
    if (effId === 'none') {
      setSelectedEffects(['none']);
      setEffect('none');
      return;
    }
    setSelectedEffects((prev) => {
      const withoutNone = prev.filter((item) => item !== 'none');
      let updated: VideoMotionEffect[];
      if (withoutNone.includes(effId)) {
        updated = withoutNone.filter((item) => item !== effId);
        if (updated.length === 0) updated = ['none'];
      } else {
        updated = [...withoutNone, effId];
      }
      setEffect(updated[0] || 'shake');
      return updated;
    });
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
        effect: selectedEffects[0] || effect || 'subtle_float',
        effects: selectedEffects,
        effectDurationSeconds: effectDuration,
        motionIntensity,
        overlays: selectedOverlays,
        overlayIntensity,
        musicUrl,
        musicName,
        musicVolume,
        targetPlatforms: ['facebook', 'instagram', 'youtube'],
      },
    };
    saveReelTemplate(updated);
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
        effect: selectedEffects[0] || effect || 'subtle_float',
        effects: selectedEffects,
        effectDurationSeconds: effectDuration,
        motionIntensity,
        overlays: selectedOverlays,
        overlayIntensity,
        musicUrl,
        musicName,
        musicVolume,
        targetPlatforms: ['facebook', 'instagram', 'youtube'],
      },
    };
    saveReelTemplate(currentUpdated);
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

    deleteReelTemplate(templateId);
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
    const w = Number(newTmplWidth) || 1080;
    const h = Number(newTmplHeight) || 1920;
    const isPortrait = h > w;

    const newTemplate: SigTemplate = {
      id: newId,
      name: newTmplName.trim(),
      templateType: 'reel',
      canvasWidth: w,
      canvasHeight: h,
      templateImageUrl: newTmplImageUrl.trim() || '',
      layerMode: 'overlay',
      backgroundColor: '#0B0F19',
      videoConfig: {
        enabled: true,
        durationSeconds: 15,
        effect: newTmplEffect,
        effects: [newTmplEffect],
        effectDurationSeconds: 15,
        overlays: ['floating_dust', 'glitter_sparkle'],
        musicUrl: selectedMusicObj.url,
        musicName: selectedMusicObj.name,
        musicVolume: 100,
        targetPlatforms: ['facebook', 'instagram', 'youtube'],
      },
      featuredImageBox: {
        x: Math.round(w * 0.04),
        y: Math.round(h * 0.08),
        width: Math.round(w * 0.92),
        height: Math.round(h * (isPortrait ? 0.52 : 0.60)),
        borderRadius: 20,
      },
      titleBox: {
        x: Math.round(w * 0.06),
        y: Math.round(h * (isPortrait ? 0.64 : 0.72)),
        width: Math.round(w * 0.88),
        height: Math.round(h * (isPortrait ? 0.30 : 0.24)),
        fontSize: Math.max(36, Math.round(h * 0.038)),
        lineHeight: 1.35,
        textColor: '#FFFFFF',
        highlightColor: '#FACC15',
        fontFamily: 'Noto Sans Devanagari',
        alignment: 'center',
        verticalAlignment: 'center',
      },
    };

    saveReelTemplate(newTemplate);
    setSelectedTemplateId(newId);
    setIsNewModalOpen(false);
    setActiveTab('editor');
    setSaveMessage(`New Reel template "${newTmplName}" (${w}×${h}) created!`);
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

  // Toggle Audio Play / Pause & keep live preview volume synced with slider
  useEffect(() => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.volume = Math.max(0.05, Math.min(1.0, musicVolume / 100));
    }
  }, [musicVolume]);

  const togglePlayAudio = (urlToPlay: string) => {
    if (!audioPreviewRef.current) return;

    if (isPlayingAudio && audioPreviewRef.current.src.includes(urlToPlay)) {
      audioPreviewRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPreviewRef.current.src = urlToPlay;
      audioPreviewRef.current.volume = Math.max(0.05, Math.min(1.0, musicVolume / 100));
      audioPreviewRef.current.play().catch(() => {});
      setIsPlayingAudio(true);
    }
  };

  // Generate Reel Video Preview
  const handleGenerateReel = async () => {
    setIsGeneratingReel(true);
    setGeneratedVideoUrl(null);

    try {
      // Step 1: Render Composite Card onto canvas
      const offscreenCanvas = document.createElement('canvas');
      const currentDraftTemplate: SigTemplate = {
        ...activeTemplate,
        name: templateName,
        templateType: 'reel',
        canvasWidth,
        canvasHeight,
        templateImageUrl,
        backgroundColor,
        layerMode,
        featuredImageBox: fBox,
        titleBox: tBox,
      };

      let cardDataUrl = '';
      try {
        cardDataUrl = await renderTemplateToCanvas(offscreenCanvas, {
          template: currentDraftTemplate,
          headline: genHeadline,
          highlightPhrase: genHighlight,
          featuredImageUrl: genPhotoUrl,
        });
        setLastRenderedCardUrl(cardDataUrl);
      } catch (canvasErr) {
        console.warn('[Reel Studio] Client canvas render error, falling back to server-side compositor:', canvasErr);
      }

      // Step 2: Call /api/video/generate to render high-quality MP4 with motion & music
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: cardDataUrl || undefined,
          template: currentDraftTemplate,
          headline: genHeadline,
          highlightPhrase: genHighlight,
          featuredImageUrl: genPhotoUrl,
          canvasWidth,
          canvasHeight,
          duration,
          durationSeconds: duration,
          effect: selectedEffects[0] || effect || 'subtle_float',
          effects: selectedEffects,
          effectDurationSeconds: effectDuration,
          motionIntensity,
          overlays: selectedOverlays,
          overlayIntensity,
          musicUrl,
          musicVolume,
          outputFilename: `reel_${activeTemplate.id}_${Date.now()}`,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let errMsg = `Server returned status ${res.status}`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error) errMsg = parsed.error;
        } catch {
          if (errText) errMsg = errText.slice(0, 250);
        }
        alert(`Failed to render reel: ${errMsg}`);
        return;
      }

      const data = await res.json();
      if (data.success && data.videoUrl) {
        setVideoLoadError(false);
        const cacheBustedUrl = `${data.videoUrl}${data.videoUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        setGeneratedVideoUrl(cacheBustedUrl);
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

  // ── Reel Player Handlers ──
  const handleTogglePlayReel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!reelVideoRef.current) return;
    const vid = reelVideoRef.current;
    if (vid.paused) {
      vid
        .play()
        .then(() => setIsPlayingReel(true))
        .catch(() => {
          // If browser blocked unmuted, mute and retry
          vid.muted = true;
          setIsMutedReel(true);
          vid.play().then(() => setIsPlayingReel(true)).catch(() => {});
        });
    } else {
      vid.pause();
      setIsPlayingReel(false);
    }
  };

  const handleToggleMuteReel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!reelVideoRef.current) return;
    const vid = reelVideoRef.current;
    const nextMuted = !vid.muted;
    vid.muted = nextMuted;
    setIsMutedReel(nextMuted);
    if (vid.paused) {
      vid.play().then(() => setIsPlayingReel(true)).catch(() => {});
    }
  };

  const handleRestartReel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!reelVideoRef.current) return;
    const vid = reelVideoRef.current;
    vid.currentTime = 0;
    vid.play().then(() => setIsPlayingReel(true)).catch(() => {});
  };

  return (
    <AppShell>
      <div className="space-y-6 font-sans max-w-7xl pb-24 select-none animate-fade-in">
        {/* Global Keyframes for Live Motion Preview (dynamically driven by Motion Intensity CSS variables) */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes liveSubtleFloat {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(var(--float-x, 4px), calc(var(--float-y, -5px) * -0.7)) scale(1.012); }
            66% { transform: translate(calc(var(--float-x, 4px) * -0.7), var(--float-y, 5px)) scale(1.006); }
          }
          @keyframes liveMicroJitter {
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(var(--jitter-x, 2px), calc(var(--jitter-y, 2px) * -0.8)); }
            50% { transform: translate(calc(var(--jitter-x, 2px) * -0.9), var(--jitter-y, 2px)); }
            75% { transform: translate(calc(var(--jitter-x, 2px) * 0.6), calc(var(--jitter-y, 2px) * 0.9)); }
          }
          @keyframes liveSmoothSway {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(var(--sway-x, 6px), -2px) rotate(var(--sway-rot, 0.4deg)); }
            75% { transform: translate(calc(var(--sway-x, 6px) * -1), 2px) rotate(calc(var(--sway-rot, 0.4deg) * -1)); }
          }
          @keyframes liveVerticalDrift {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(calc(var(--drift-y, 6px) * -1)); }
          }
          @keyframes livePulseShake {
            0%, 100% { transform: scale(1) translate(0, 0); }
            50% { transform: scale(var(--pulse-max, 1.025)) translate(1px, -1px); }
          }
          @keyframes liveZoomIn {
            0% { transform: scale(1); }
            100% { transform: scale(var(--zoom-max, 1.08)); }
          }
          @keyframes liveZoomOut {
            0% { transform: scale(var(--zoom-max, 1.08)); }
            100% { transform: scale(1); }
          }
          @keyframes liveShake {
            0%, 60%, 100% { transform: translate(0, 0); }
            10% { transform: translate(calc(var(--shake-x, 4px) * -1), var(--shake-y, 3px)); }
            20% { transform: translate(var(--shake-x, 4px), calc(var(--shake-y, 3px) * -1)); }
            30% { transform: translate(calc(var(--shake-x, 4px) * -0.8), calc(var(--shake-y, 3px) * -0.8)); }
            40% { transform: translate(calc(var(--shake-x, 4px) * 0.8), calc(var(--shake-y, 3px) * 0.7)); }
            50% { transform: translate(calc(var(--shake-x, 4px) * -0.4), calc(var(--shake-y, 3px) * 0.4)); }
          }
          @keyframes liveBreakingJitter {
            0%, 100% { transform: translate(0, 0); filter: brightness(1); }
            15% { transform: translate(calc(var(--shake-x, 4px) * -0.9), var(--shake-y, 3px)); filter: brightness(1.08); }
            30% { transform: translate(var(--shake-x, 4px), calc(var(--shake-y, 3px) * -0.9)); filter: brightness(1); }
            45% { transform: translate(calc(var(--shake-x, 4px) * -0.7), calc(var(--shake-y, 3px) * -0.7)); filter: brightness(1.06); }
            60% { transform: translate(calc(var(--shake-x, 4px) * 0.6), calc(var(--shake-y, 3px) * 0.6)); filter: brightness(1); }
          }
          @keyframes liveGlitterShimmer {
            0%, 100% { filter: brightness(1) saturate(1); }
            50% { filter: brightness(var(--glitter-bright, 1.08)) saturate(var(--glitter-sat, 1.18)); }
          }
        ` }} />

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
                const activeEffectsList = vConf.effects || (vConf.effect ? [vConf.effect] : ['shake']);
                const currentEff = MOTION_EFFECTS.find((m) => m.id === (activeEffectsList[0] || 'shake')) || MOTION_EFFECTS[0];
                const reelDur = vConf.durationSeconds || 15;
                const effDur = vConf.effectDurationSeconds || reelDur;

                return (
                  <div
                    key={t.id}
                    className={`bg-white rounded-3xl border p-4 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] transition-all flex flex-col justify-between space-y-3.5 ${
                      isSelected ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-[#EEF1F6]'
                    }`}
                  >
                    <div>
                      {/* Responsive Mockup Preview Card */}
                      <div
                        className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/50 mb-3 group flex items-center justify-center w-full"
                        style={{
                          aspectRatio: `${t.canvasWidth || 1080} / ${t.canvasHeight || 1920}`,
                          maxHeight: '320px',
                        }}
                      >
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
                              {getAspectRatioLabel(t.canvasWidth || 1080, t.canvasHeight || 1920)}
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
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-600/90 text-white text-[9px] font-bold shadow-xs">
                            {getAspectRatioLabel(t.canvasWidth || 1080, t.canvasHeight || 1920)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-bold shadow-xs">
                            {reelDur}s Reel ({effDur}s Anim)
                          </span>
                          {t.isDefault && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-bold shadow-xs">
                              Default
                            </span>
                          )}
                        </div>

                        {/* Motion badge pill on preview */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-bold text-white bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10">
                          <div className="flex items-center gap-1 flex-wrap">
                            {activeEffectsList.slice(0, 2).map((effId) => {
                              const effObj = MOTION_EFFECTS.find((m) => m.id === effId) || MOTION_EFFECTS[0];
                              return (
                                <span key={effId} className="flex items-center gap-0.5">
                                  <span>{effObj.icon}</span>
                                  <span className="text-[9px] truncate max-w-[70px]">{effObj.name}</span>
                                </span>
                              );
                            })}
                            {activeEffectsList.length > 2 && (
                              <span className="text-[9px] text-rose-400 font-bold">+{activeEffectsList.length - 2}</span>
                            )}
                          </div>
                          <span className="text-amber-400 font-mono text-[9px] shrink-0">🎵 {vConf.musicName || 'Beat'}</span>
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
                  {canvasWidth}×{canvasHeight} ({getAspectRatioLabel(canvasWidth, canvasHeight)})
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
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const fd = new FormData();
                        fd.append('file', file);
                        const r = await fetch('/api/upload', { method: 'POST', body: fd });
                        const d = await r.json();
                        if (d.success && d.url) {
                          setTemplateImageUrl(d.url);
                          setSaveMessage(`Frame overlay "${file.name}" uploaded successfully!`);
                          setSaveSuccess(true);
                          setTimeout(() => setSaveSuccess(false), 2500);
                        } else {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const dataUrl = ev.target?.result as string;
                            if (dataUrl) setTemplateImageUrl(dataUrl);
                          };
                          reader.readAsDataURL(file);
                        }
                      } catch {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          if (dataUrl) setTemplateImageUrl(dataUrl);
                        };
                        reader.readAsDataURL(file);
                      }
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

            {/* Canvas Aspect Ratio & Custom Dimensions Selector */}
            <div className="bg-white rounded-2xl border border-[#EEF1F6] p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-rose-600" />
                  <span>Canvas Aspect Ratio:</span>
                </span>
                {[
                  { label: '9:16 Reel (1080×1920)', w: 1080, h: 1920 },
                  { label: '4:5 Feed (1080×1350)', w: 1080, h: 1350 },
                  { label: '1:1 Square (1080×1080)', w: 1080, h: 1080 },
                  { label: '16:9 Landscape (1920×1080)', w: 1920, h: 1080 },
                ].map((ratio) => {
                  const isActive = canvasWidth === ratio.w && canvasHeight === ratio.h;
                  return (
                    <button
                      key={ratio.label}
                      type="button"
                      onClick={() => {
                        setCanvasWidth(ratio.w);
                        setCanvasHeight(ratio.h);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-rose-600 text-white shadow-2xs ring-2 ring-rose-500/20'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom W x H Inputs */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold text-slate-500">Custom Size:</span>
                <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-400">W:</span>
                  <input
                    type="number"
                    min={320}
                    max={3840}
                    step={10}
                    value={canvasWidth}
                    onChange={(e) => setCanvasWidth(Math.max(320, Number(e.target.value) || 1080))}
                    className="w-16 bg-transparent font-mono font-bold text-xs text-slate-900 focus:outline-none text-center"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">×</span>
                  <span className="text-[10px] font-mono text-slate-400">H:</span>
                  <input
                    type="number"
                    min={320}
                    max={3840}
                    step={10}
                    value={canvasHeight}
                    onChange={(e) => setCanvasHeight(Math.max(320, Number(e.target.value) || 1920))}
                    className="w-16 bg-transparent font-mono font-bold text-xs text-slate-900 focus:outline-none text-center"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">px</span>
                </div>
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
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent:
                          tBox.verticalAlignment === 'top'
                            ? 'flex-start'
                            : tBox.verticalAlignment === 'bottom'
                            ? 'flex-end'
                            : 'center',
                        alignItems:
                          tBox.alignment === 'left'
                            ? 'flex-start'
                            : tBox.alignment === 'right'
                            ? 'flex-end'
                            : 'center',
                        textAlign: tBox.alignment || 'center',
                        color: tBox.textColor || '#FFFFFF',
                        fontSize: `${Math.round((tBox.fontSize || 56) * displayScale)}px`,
                        lineHeight: tBox.lineHeight || 1.35,
                        fontFamily: `"${tBox.fontFamily || 'Noto Sans Devanagari'}", "Poppins", sans-serif`,
                        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                        padding: `${Math.round(6 * displayScale)}px`,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                      }}
                      className="font-bold"
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

                    {/* Text Alignment & Centering Controls */}
                    <div className="space-y-2 pt-2 border-t border-[#EEF1F6]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                          <AlignCenter className="w-3.5 h-3.5 text-rose-600" />
                          <span>Text Alignment (Position)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setTBox((p) => ({
                              ...p,
                              alignment: 'center',
                              verticalAlignment: 'center',
                            }))
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1 transition-all cursor-pointer ${
                            tBox.alignment === 'center' && (tBox.verticalAlignment === 'center' || !tBox.verticalAlignment)
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                          title="Set both Horizontal and Vertical alignment to Center"
                        >
                          <span>🎯 Center Both (H + V)</span>
                        </button>
                      </div>

                      {/* Horizontal Alignment */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-slate-500 font-bold">
                            Horizontal Alignment (Left / Center / Right)
                          </label>
                          <span className="text-[9px] font-mono text-slate-400 capitalize">
                            {tBox.alignment || 'center'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 p-1 bg-[#F8F9FD] rounded-xl border border-[#EEF1F6]">
                          <button
                            type="button"
                            onClick={() => setTBox((p) => ({ ...p, alignment: 'left' }))}
                            className={`py-1.5 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              tBox.alignment === 'left'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-black'
                            }`}
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                            <span>Left</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTBox((p) => ({ ...p, alignment: 'center' }))}
                            className={`py-1.5 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              tBox.alignment === 'center' || !tBox.alignment
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-black'
                            }`}
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                            <span>Center</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTBox((p) => ({ ...p, alignment: 'right' }))}
                            className={`py-1.5 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              tBox.alignment === 'right'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-black'
                            }`}
                          >
                            <AlignRight className="w-3.5 h-3.5" />
                            <span>Right</span>
                          </button>
                        </div>
                      </div>

                      {/* Vertical Alignment */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-slate-500 font-bold">
                            Vertical Alignment (Top / Center / Bottom)
                          </label>
                          <span className="text-[9px] font-mono text-slate-400 capitalize">
                            {tBox.verticalAlignment || 'center'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 p-1 bg-[#F8F9FD] rounded-xl border border-[#EEF1F6]">
                          <button
                            type="button"
                            onClick={() => setTBox((p) => ({ ...p, verticalAlignment: 'top' }))}
                            className={`py-1.5 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              tBox.verticalAlignment === 'top'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-black'
                            }`}
                          >
                            <span className="text-xs">⬆️</span>
                            <span>Top</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTBox((p) => ({ ...p, verticalAlignment: 'center' }))}
                            className={`py-1.5 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              tBox.verticalAlignment === 'center' || !tBox.verticalAlignment
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-black'
                            }`}
                          >
                            <span className="text-xs">↕️</span>
                            <span>Center</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTBox((p) => ({ ...p, verticalAlignment: 'bottom' }))}
                            className={`py-1.5 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              tBox.verticalAlignment === 'bottom'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-black'
                            }`}
                          >
                            <span className="text-xs">⬇️</span>
                            <span>Bottom</span>
                          </button>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Motion Styles, Intensity, Overlays, Music & Duration */}
            <div className="lg:col-span-7 space-y-6">
              {/* Section 1: Motion Animations (Multi-Select) */}
              <div className="bg-white rounded-3xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-rose-600" />
                      <span>Motion Animation Style (Multi-Select)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Select camera motion animations. Multi-selection supported. High readability optimized for news headlines.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                      {selectedEffects.filter((e) => e !== 'none').length} Active
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const combo: VideoMotionEffect[] = ['subtle_float'];
                        setSelectedEffects(combo);
                        setEffect('subtle_float');
                        setMotionIntensity(20);
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 px-2 py-0.5 rounded-lg bg-rose-50/70 border border-rose-200 cursor-pointer"
                      title="Recommended: Gentle floating shake for crisp headline reading"
                    >
                      Gentle News
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEffects(['none']);
                        setEffect('none');
                      }}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {MOTION_EFFECTS.map((m) => {
                    const isSelected =
                      m.id === 'none'
                        ? selectedEffects.includes('none')
                        : selectedEffects.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleToggleEffect(m.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 select-none relative ${
                          isSelected
                            ? 'bg-rose-50/60 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                            : 'bg-white border-[#EEF1F6] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-lg">{m.icon}</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-md border ${m.badgeColor}`}>
                              {m.badge}
                            </span>
                            <span
                              className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-rose-600 border-rose-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                            {m.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                            {m.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Motion Intensity Slider */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-rose-600" />
                        <span>Motion Shake Intensity</span>
                      </label>
                      <p className="text-[10px] text-slate-400">
                        Controls camera displacement speed &amp; amplitude (Keep low 10%-25% so viewer can read Hindi headline)
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-mono font-black text-xs">
                      {motionIntensity}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMotionIntensity((p) => Math.max(5, p - 5))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                      title="-5%"
                    >
                      -5%
                    </button>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      value={motionIntensity}
                      onChange={(e) => setMotionIntensity(Number(e.target.value))}
                      className="flex-1 cursor-pointer accent-rose-600"
                    />
                    <button
                      type="button"
                      onClick={() => setMotionIntensity((p) => Math.min(100, p + 5))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                      title="+5%"
                    >
                      +5%
                    </button>
                  </div>

                  {/* Preset Pills for Motion Intensity */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { val: 10, label: '10% (Ultra Gentle)' },
                      { val: 20, label: '20% (Recommended / Readable)' },
                      { val: 35, label: '35% (Dynamic)' },
                      { val: 60, label: '60% (High Energy)' },
                      { val: 100, label: '100% (Maximum)' },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setMotionIntensity(p.val)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          motionIntensity === p.val
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 2: Multi-Select Visual Atmospheric Overlays */}
              <div className="bg-white rounded-3xl border border-[#EEF1F6] p-5 shadow-[0_4px_20px_-2px_rgba(18,28,45,0.03)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Visual Atmospheric Overlays (Multi-Select)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ambient falling particles, floating dust motes, sparkles, bokeh orbs, and film grain textures.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                      {selectedOverlays.length} Active
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedOverlays([])}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {VIDEO_OVERLAYS.map((ov) => {
                    const isChecked = selectedOverlays.includes(ov.id);
                    return (
                      <div
                        key={ov.id}
                        onClick={() => handleToggleOverlay(ov.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 select-none ${
                          isChecked
                            ? 'bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-500/20'
                            : 'bg-white border-[#EEF1F6] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{ov.icon}</span>
                          <span
                            className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                            {ov.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                            {ov.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Atmospheric Overlay Intensity / Density Slider */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Particle Density &amp; Opacity</span>
                      </label>
                      <p className="text-[10px] text-slate-400">
                        Adjust particle count, speed, and visibility (Live preview updates immediately)
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-black text-xs">
                      {overlayIntensity}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOverlayIntensity((p) => Math.max(10, p - 10))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                      title="-10%"
                    >
                      -10%
                    </button>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={overlayIntensity}
                      onChange={(e) => setOverlayIntensity(Number(e.target.value))}
                      className="flex-1 cursor-pointer accent-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setOverlayIntensity((p) => Math.min(100, p + 10))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                      title="+10%"
                    >
                      +10%
                    </button>
                  </div>

                  {/* Preset Pills for Overlay Intensity */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { val: 20, label: '20% (Subtle Dust)' },
                      { val: 40, label: '40% (Recommended)' },
                      { val: 60, label: '60% (Cinematic)' },
                      { val: 85, label: '85% (Heavy Snow/Embers)' },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setOverlayIntensity(p.val)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          overlayIntensity === p.val
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 3: Music Library, Duration, & Save */}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_MUSIC_TRACKS.map((t) => {
                    const isSelected = musicUrl === t.url;
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-rose-50/50 border-rose-500 ring-1 ring-rose-500/30'
                            : 'bg-white border-[#EEF1F6] hover:border-slate-200'
                        }`}
                      >
                        <div
                          className="flex-1 cursor-pointer min-w-0"
                          onClick={() => {
                            setMusicUrl(t.url);
                            setMusicName(t.name);
                          }}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-black text-slate-900 truncate">{t.name}</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[8px] font-bold shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{t.description}</p>
                        </div>

                        {/* Audio Preview Button */}
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(t.url)}
                          className="w-7 h-7 rounded-full bg-slate-900 hover:bg-black text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                          title="Listen to preview beat"
                        >
                          {isPlayingAudio && audioPreviewRef.current?.src.includes(t.url) ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3 ml-0.5" />
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

                {/* Animation Active Duration Tuner */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-rose-600" />
                        <span>Animation Active Duration</span>
                      </label>
                      <p className="text-[10px] text-slate-400">
                        Active motion time before smooth frame freeze
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold text-xs">
                      {effectDuration}s
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEffectDuration((prev) => Math.max(2, prev - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                    >
                      -1s
                    </button>
                    <input
                      type="range"
                      min={2}
                      max={duration}
                      value={Math.min(effectDuration, duration)}
                      onChange={(e) => setEffectDuration(Number(e.target.value))}
                      className="flex-1 cursor-pointer accent-rose-600"
                    />
                    <button
                      type="button"
                      onClick={() => setEffectDuration((prev) => Math.min(duration, prev + 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                    >
                      +1s
                    </button>
                  </div>
                </div>

                {/* Custom Total Reel Duration Tuner */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Custom Reel Duration</span>
                      </label>
                      <p className="text-[10px] text-slate-400">
                        Total MP4 length (5s to 90s)
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={5}
                        max={90}
                        value={duration}
                        onChange={(e) => {
                          const val = Math.min(90, Math.max(5, Number(e.target.value) || 15));
                          setDuration(val);
                          if (effectDuration > val) setEffectDuration(val);
                        }}
                        className="w-14 px-1.5 py-0.5 rounded-lg border border-indigo-200 bg-indigo-50/50 text-indigo-700 font-mono font-black text-center text-xs"
                      />
                      <span className="text-xs font-bold text-slate-500">s</span>
                    </div>
                  </div>

                  {/* Range Slider for Reel Duration */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(5, duration - 5);
                        setDuration(next);
                        if (effectDuration > next) setEffectDuration(next);
                      }}
                      className="px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                      title="-5 seconds"
                    >
                      -5s
                    </button>
                    <input
                      type="range"
                      min={5}
                      max={90}
                      step={1}
                      value={duration}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDuration(val);
                        if (effectDuration > val) setEffectDuration(val);
                      }}
                      className="flex-1 cursor-pointer accent-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(90, duration + 5);
                        setDuration(next);
                      }}
                      className="px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                      title="+5 seconds"
                    >
                      +5s
                    </button>
                  </div>

                  {/* Preset Quick Pills for Reel Duration */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { s: 5, label: '5s' },
                      { s: 10, label: '10s' },
                      { s: 15, label: '15s' },
                      { s: 30, label: '30s' },
                      { s: 45, label: '45s' },
                      { s: 60, label: '60s' },
                      { s: 75, label: '75s' },
                      { s: 90, label: '90s' },
                    ].map((p) => (
                      <button
                        key={p.s}
                        type="button"
                        onClick={() => {
                          setDuration(p.s);
                          if (effectDuration > p.s) setEffectDuration(p.s);
                        }}
                        className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                          duration === p.s
                            ? 'bg-slate-900 text-white shadow-2xs ring-1 ring-slate-900'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {p.label}
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

            {/* Right 5 Cols: Sticky Real-time Live UI Preview */}
            <div className="lg:col-span-5 sticky top-6 space-y-4">
              <ReelLiveMockupPreview
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                templateImageUrl={templateImageUrl}
                layerMode={layerMode}
                backgroundColor={backgroundColor}
                fBox={fBox}
                tBox={tBox}
                headline={genHeadline}
                highlight={genHighlight}
                photoUrl={genPhotoUrl}
                selectedEffects={selectedEffects}
                motionIntensity={motionIntensity}
                selectedOverlays={selectedOverlays}
                overlayIntensity={overlayIntensity}
                isLiveMotionPlaying={isLiveMotionPlaying}
                onToggleMotion={() => setIsLiveMotionPlaying((p) => !p)}
                onGoToGenerator={() => setActiveTab('generator')}
              />
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
                  Generate Test Video Reel ({canvasWidth}×{canvasHeight})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Renders the template layout in authentic {getAspectRatioLabel(canvasWidth, canvasHeight)}, applies selected motion animation, overlays, and cuts background music into an MP4 video.
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
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const fd = new FormData();
                            fd.append('file', file);
                            const r = await fetch('/api/upload', { method: 'POST', body: fd });
                            const d = await r.json();
                            if (d.success && d.url) {
                              setGenPhotoUrl(d.url);
                            } else {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const dataUrl = ev.target?.result as string;
                                if (dataUrl) setGenPhotoUrl(dataUrl);
                              };
                              reader.readAsDataURL(file);
                            }
                          } catch {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              if (dataUrl) setGenPhotoUrl(dataUrl);
                            };
                            reader.readAsDataURL(file);
                          }
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
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px]">
                <div className="flex items-start justify-between gap-2 text-slate-600 font-semibold">
                  <span className="shrink-0">Motion Styles:</span>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {selectedEffects.filter((e) => e !== 'none').length > 0 ? (
                      selectedEffects
                        .filter((e) => e !== 'none')
                        .map((effId) => {
                          const mObj = MOTION_EFFECTS.find((m) => m.id === effId);
                          return (
                            <span
                              key={effId}
                              className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[9px] font-bold border border-rose-200 flex items-center gap-1"
                            >
                              <span>{mObj?.icon}</span>
                              <span>{mObj?.name}</span>
                            </span>
                          );
                        })
                    ) : (
                      <span className="text-slate-400 font-normal">Static Card Hold</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-600 font-semibold">
                  <span>Anim Active Time:</span>
                  <strong className="text-rose-600 font-mono font-bold">
                    {effectDuration}s
                    {effectDuration < duration ? ` (holds last ${duration - effectDuration}s)` : ' (full)'}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 font-semibold">
                  <span>Custom Reel Duration:</span>
                  <strong className="text-indigo-600 font-mono font-bold">{duration} seconds</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 font-semibold">
                  <span>Audio:</span>
                  <strong className="text-slate-900">{musicName} ({musicVolume}%)</strong>
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
                    <span>Rendering {canvasWidth}×{canvasHeight} Video Reel (FFmpeg)...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>Generate {canvasWidth}×{canvasHeight} Video Reel</span>
                  </>
                )}
              </button>
            </div>

            {/* Right 7 Cols: Mobile Frame Mockup & Video Player */}
            <div className="lg:col-span-7 bg-slate-950/95 rounded-3xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[580px] shadow-2xl relative">
              {generatedVideoUrl ? (
                <div className="flex flex-col items-center space-y-4 max-w-md w-full animate-fade-in">
                  {/* Phone Mockup Frame with Dynamic Aspect Ratio */}
                  <div
                    className="relative w-full rounded-[36px] overflow-hidden border-4 border-slate-700 shadow-2xl bg-black group select-none mx-auto"
                    style={{
                      aspectRatio: `${canvasWidth} / ${canvasHeight}`,
                      maxWidth:
                        canvasHeight > canvasWidth
                          ? canvasWidth / canvasHeight < 0.65
                            ? '280px' // 9:16 portrait
                            : '330px' // 4:5 portrait
                          : canvasWidth === canvasHeight
                          ? '350px' // 1:1 square
                          : '460px', // 16:9 landscape
                    }}
                  >
                    {/* Top Speaker / Camera Notch */}
                    <div className="absolute top-0 inset-x-0 h-4 flex justify-center z-30 pointer-events-none">
                      <div className="w-20 h-3.5 bg-black rounded-b-xl border-b border-x border-slate-800 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-700 mr-2" />
                        <div className="w-6 h-1 rounded-full bg-slate-800" />
                      </div>
                    </div>

                    {/* Sound Pill (Top Right) */}
                    <button
                      type="button"
                      onClick={handleToggleMuteReel}
                      className={`absolute top-4 right-3 z-30 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md shadow-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        isMutedReel
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40 animate-pulse'
                          : 'bg-black/70 text-emerald-300 border border-emerald-500/40'
                      }`}
                      title={isMutedReel ? 'Click to Unmute' : 'Click to Mute'}
                    >
                      {isMutedReel ? (
                        <>
                          <VolumeX className="w-3 h-3 text-rose-400" />
                          <span>Sound Off</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 text-emerald-400" />
                          <span>Sound On</span>
                        </>
                      )}
                    </button>

                    {/* HTML5 Video Element */}
                    <video
                      ref={reelVideoRef}
                      key={generatedVideoUrl}
                      src={generatedVideoUrl || undefined}
                      poster={lastRenderedCardUrl || undefined}
                      controls={showNativeControls}
                      autoPlay
                      muted={isMutedReel}
                      loop
                      playsInline
                      preload="auto"
                      onLoadedMetadata={(e) => {
                        const vid = e.currentTarget;
                        setReelTotalDuration(vid.duration || 0);
                      }}
                      onCanPlay={(e) => {
                        const vid = e.currentTarget;
                        if (vid.paused) {
                          vid
                            .play()
                            .then(() => setIsPlayingReel(true))
                            .catch(() => {
                              vid.muted = true;
                              setIsMutedReel(true);
                              vid.play().then(() => setIsPlayingReel(true)).catch(() => setIsPlayingReel(false));
                            });
                        }
                      }}
                      onError={(e) => {
                        const err = e.currentTarget.error;
                        console.warn('[ReelStudio] Video player error:', err?.code, err?.message);
                        setVideoLoadError(true);
                      }}
                      onTimeUpdate={(e) => {
                        const vid = e.currentTarget;
                        setReelCurrentTime(vid.currentTime);
                        if (vid.duration) {
                          setReelProgress((vid.currentTime / vid.duration) * 100);
                        }
                      }}
                      onPlay={() => {
                        setIsPlayingReel(true);
                        setVideoLoadError(false);
                      }}
                      onPause={() => setIsPlayingReel(false)}
                      onClick={showNativeControls ? undefined : handleTogglePlayReel}
                      className="w-full h-full object-contain bg-black cursor-pointer"
                    >
                      <source src={generatedVideoUrl} type="video/mp4" />
                      Your browser does not support HTML5 video.
                    </video>

                    {/* Error Fallback Banner if video playback fails */}
                    {videoLoadError && (
                      <div className="absolute inset-0 z-35 flex flex-col items-center justify-center p-6 bg-slate-950/92 text-center space-y-3 backdrop-blur-xs select-none">
                        <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                          <Film className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-white font-black text-xs">Video Playback Notice</p>
                          <p className="text-[11px] text-slate-300 mt-1">Browser security or codec issue loading video stream</p>
                        </div>
                        <div className="flex flex-col gap-2 w-full pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowNativeControls(true);
                              setVideoLoadError(false);
                              if (reelVideoRef.current) {
                                reelVideoRef.current.load();
                                reelVideoRef.current.play().catch(() => {});
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-md"
                          >
                            ▶️ Play with Native Player
                          </button>
                          <a
                            href={generatedVideoUrl}
                            download="reel-output.mp4"
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer inline-block"
                          >
                            ⬇️ Download MP4 File
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Center Big Play Button Overlay (when paused) */}
                    {!isPlayingReel && !showNativeControls && (
                      <div
                        onClick={handleTogglePlayReel}
                        className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer transition-opacity"
                      >
                        <div className="w-16 h-16 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-2xl pl-1 hover:scale-110 transition-transform">
                          <Play className="w-8 h-8 fill-white" />
                        </div>
                      </div>
                    )}

                    {/* Bottom Custom Reels Overlay & Timeline */}
                    {!showNativeControls && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-0 inset-x-0 z-25 p-3.5 pt-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2 text-white pointer-events-auto"
                      >
                        {/* Audio Music Track Title */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-300 truncate font-medium">
                          <Music className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="truncate">{musicName || 'Reel Background Beat'}</span>
                        </div>

                        {/* Interactive Progress Scrubber */}
                        <div
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                            if (reelVideoRef.current && reelTotalDuration) {
                              reelVideoRef.current.currentTime = pos * reelTotalDuration;
                            }
                          }}
                          className="w-full h-1.5 hover:h-2.5 bg-white/20 rounded-full overflow-hidden cursor-pointer transition-all"
                        >
                          <div
                            className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, reelProgress))}%` }}
                          />
                        </div>

                        {/* Control Buttons & Counter */}
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={handleTogglePlayReel}
                              className="text-white hover:text-rose-400 transition-colors cursor-pointer"
                              title={isPlayingReel ? 'Pause' : 'Play'}
                            >
                              {isPlayingReel ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4 fill-white" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleRestartReel}
                              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Restart from beginning"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <span>
                              {Math.floor(reelCurrentTime)}s / {Math.floor(reelTotalDuration || duration)}s
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={handleToggleMuteReel}
                            className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title={isMutedReel ? 'Unmute' : 'Mute'}
                          >
                            {isMutedReel ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Player Controls Style Switcher */}
                  <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => setShowNativeControls(!showNativeControls)}
                      className="hover:text-rose-400 underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      {showNativeControls ? 'Switch to Reels Player UI' : 'Switch to Browser Native Controls'}
                    </button>
                  </div>

                  {/* Metadata and Action Buttons */}
                  <div className="flex items-center justify-between w-full text-xs font-mono text-slate-400 px-2">
                    <span>
                      Format: {canvasWidth}×{canvasHeight} MP4 ({getAspectRatioLabel(canvasWidth, canvasHeight)})
                    </span>
                    {generatedVideoSize && (
                      <span>Size: {(generatedVideoSize / 1024 / 1024).toFixed(2)} MB</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full">
                    <a
                      href={generatedVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      title="Open full video in a new browser tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Tab</span>
                    </a>

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
                    <h3 className="font-black text-sm text-slate-900">Create New Reel Template</h3>
                    <p className="text-[11px] text-slate-400">Supports 9:16 (1080×1920), 4:5 (1080×1350), 1:1, or custom size</p>
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
                  <label className="font-bold text-slate-700 block mb-1">Aspect Ratio / Size</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {[
                      { label: '9:16 Reel (1080×1920)', w: 1080, h: 1920 },
                      { label: '4:5 Feed (1080×1350)', w: 1080, h: 1350 },
                      { label: '1:1 Square (1080×1080)', w: 1080, h: 1080 },
                      { label: '16:9 Landscape (1920×1080)', w: 1920, h: 1080 },
                    ].map((preset) => {
                      const isActive = newTmplWidth === preset.w && newTmplHeight === preset.h;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setNewTmplWidth(preset.w);
                            setNewTmplHeight(preset.h);
                          }}
                          className={`py-1.5 px-2.5 rounded-xl text-center font-bold text-xs cursor-pointer transition-all border ${
                            isActive
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Custom (px):</span>
                    <input
                      type="number"
                      min={320}
                      max={3840}
                      value={newTmplWidth}
                      onChange={(e) => setNewTmplWidth(Math.max(320, Number(e.target.value) || 1080))}
                      className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-[#F8F9FD] font-mono text-center font-bold"
                    />
                    <span className="text-slate-400 font-bold">×</span>
                    <input
                      type="number"
                      min={320}
                      max={3840}
                      value={newTmplHeight}
                      onChange={(e) => setNewTmplHeight(Math.max(320, Number(e.target.value) || 1920))}
                      className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-[#F8F9FD] font-mono text-center font-bold"
                    />
                  </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block">
                      Transparent PNG Frame Overlay (Optional)
                    </label>
                    <label className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Upload PNG</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const fd = new FormData();
                              fd.append('file', file);
                              const r = await fetch('/api/upload', { method: 'POST', body: fd });
                              const d = await r.json();
                              if (d.success && d.url) {
                                setNewTmplImageUrl(d.url);
                              }
                            } catch {}
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={newTmplImageUrl}
                    onChange={(e) => setNewTmplImageUrl(e.target.value)}
                    placeholder="Paste PNG URL or upload frame..."
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
