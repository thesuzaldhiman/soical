'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SigTemplate, VideoMotionEffect } from '@/types';
import {
  Film,
  Music,
  Sparkles,
  Upload,
  Play,
  Pause,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Save,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface ReelStudioTabProps {
  sigTemplates: SigTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  onSaveTemplate: (updatedTemplate: SigTemplate) => void;
  sampleHeadline: string;
  sampleImageUrl: string;
}

const MOTION_EFFECTS: Array<{
  id: VideoMotionEffect;
  name: string;
  icon: string;
  badge: string;
  description: string;
}> = [
  {
    id: 'shake',
    name: 'Camera Shake (Impact)',
    icon: '⚡',
    badge: 'Breaking News',
    description: 'Subtle high-impact vibration jitter. Perfect for breaking news, crime, and urgent announcements.',
  },
  {
    id: 'glitter',
    name: 'Glitter & Sparkles',
    icon: '✨',
    badge: 'Devotional / Mandir',
    description: 'Warm shimmering light pulses and sparkling glow. Ideal for temples, festivals, and cultural news.',
  },
  {
    id: 'zoom_in',
    name: 'Slow Zoom In',
    icon: '🔍',
    badge: 'Dramatic Focus',
    description: 'Cinematic Ken Burns slow zoom into the center of the news card.',
  },
  {
    id: 'zoom_out',
    name: 'Slow Zoom Out',
    icon: '🔎',
    badge: 'Cinematic Reveal',
    description: 'Slow zoom out starting close and smoothly revealing the entire news card.',
  },
  {
    id: 'pulse',
    name: 'Subtle Pulse',
    icon: '💓',
    badge: 'Rhythmic Alert',
    description: 'Gentle rhythmic breathing scale pulse that keeps viewer attention locked.',
  },
  {
    id: 'none',
    name: 'Static Card Hold',
    icon: '⏹️',
    badge: 'Still Frame',
    description: 'Crisp static hold with background music and audio fade-out.',
  },
];

const PRESET_MUSIC_TRACKS = [
  {
    name: 'Breaking News Beat',
    url: '/uploads/audio/breaking_news_beat.mp3',
    genre: 'News / Urgent',
  },
  {
    name: 'Devotional Ambient Flute',
    url: '/uploads/audio/devotional_ambient.mp3',
    genre: 'Bhakti / Mandir',
  },
  {
    name: 'Dramatic Action Pulse',
    url: '/uploads/audio/dramatic_pulse.mp3',
    genre: 'Action / Crime',
  },
];

export function ReelStudioTab({
  sigTemplates,
  selectedTemplateId,
  onSelectTemplate,
  onSaveTemplate,
  sampleHeadline,
  sampleImageUrl,
}: ReelStudioTabProps) {
  const currentTemplate =
    sigTemplates.find((t) => t.id === selectedTemplateId) || sigTemplates[0];

  // Video Config State
  const [enabled, setEnabled] = useState(currentTemplate?.videoConfig?.enabled ?? true);
  const [duration, setDuration] = useState<number>(
    currentTemplate?.videoConfig?.durationSeconds ?? 15
  );
  const [effect, setEffect] = useState<VideoMotionEffect>(
    currentTemplate?.videoConfig?.effect ?? 'shake'
  );
  const [musicUrl, setMusicUrl] = useState<string>(
    currentTemplate?.videoConfig?.musicUrl ?? '/uploads/audio/breaking_news_beat.mp3'
  );
  const [musicName, setMusicName] = useState<string>(
    currentTemplate?.videoConfig?.musicName ?? 'Breaking News Beat'
  );

  // Reel Preview State
  const [isGeneratingReel, setIsGeneratingReel] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedVideoSize, setGeneratedVideoSize] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Sync state when selected template changes
  useEffect(() => {
    if (currentTemplate) {
      setEnabled(currentTemplate.videoConfig?.enabled ?? true);
      setDuration(currentTemplate.videoConfig?.durationSeconds ?? 15);
      setEffect(currentTemplate.videoConfig?.effect ?? 'shake');
      setMusicUrl(currentTemplate.videoConfig?.musicUrl ?? '/uploads/audio/breaking_news_beat.mp3');
      setMusicName(currentTemplate.videoConfig?.musicName ?? 'Breaking News Beat');
      setGeneratedVideoUrl(null);
    }
  }, [currentTemplate?.id]);

  // Handle Save
  const handleSaveConfig = () => {
    if (!currentTemplate) return;
    const updated: SigTemplate = {
      ...currentTemplate,
      videoConfig: {
        enabled,
        durationSeconds: duration,
        effect,
        musicUrl,
        musicName,
        targetPlatforms: ['facebook', 'instagram', 'youtube'],
      },
    };
    onSaveTemplate(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Audio Upload Handler
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio') && !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
      setAudioError('Please upload a valid audio file (.mp3, .wav, .m4a).');
      return;
    }

    setAudioError(null);
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
      } else {
        setAudioError(data.error || 'Audio upload failed.');
      }
    } catch (err: unknown) {
      setAudioError(err instanceof Error ? err.message : 'Upload network error.');
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  // Audio Play / Pause Preview
  const togglePlayAudio = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingAudio) {
      audioPreviewRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Generate Reel Preview
  const handleGenerateReelPreview = async () => {
    setIsGeneratingReel(true);
    setGeneratedVideoUrl(null);

    try {
      // Step 1: Use sample image or template background
      const imgSource =
        sampleImageUrl ||
        currentTemplate?.templateImageUrl ||
        'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1080&h=1920&fit=crop&q=80';

      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imgSource,
          duration,
          effect,
          musicUrl,
          outputFilename: `preview_${currentTemplate.id}_${Date.now()}`,
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

  return (
    <div className="space-y-6">
      {/* ── Top Bar: Template Selector & Save ── */}
      <div className="p-4 rounded-2xl bg-white border border-[#EEF1F6] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center font-bold shadow-xs">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">
              Reel &amp; Video Motion Studio
            </h3>
            <p className="text-xs text-slate-500">
              Set auto-reel motion effect, duration, and custom background music for this template.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Template:</span>
            <select
              value={selectedTemplateId}
              onChange={(e) => onSelectTemplate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-[#F8F9FD]"
            >
              {sigTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.canvasWidth}×{t.canvasHeight})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSaveConfig}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Reel Settings</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Reel settings saved! WordPress articles matching this template will now auto-generate this exact video reel!
          </span>
        </div>
      )}

      {/* ── Main Two Column Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Settings & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Master Toggle & Duration */}
          <div className="p-5 rounded-2xl bg-white border border-[#EEF1F6] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <label className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Auto-Reel Video Generation</span>
                </label>
                <p className="text-xs text-slate-500">
                  Enable automatic 9:16 Video Reel rendering when this template is used.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600" />
              </label>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Reel Duration (Seconds):</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 30, 60].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDuration(sec)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      duration === sec
                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-2xs'
                        : 'bg-[#F8F9FD] border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {sec}s {sec === 15 && '⭐ (Best)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Motion Effects Selector */}
          <div className="p-5 rounded-2xl bg-white border border-[#EEF1F6] shadow-xs space-y-3">
            <div>
              <label className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Visual Motion Effect</span>
              </label>
              <p className="text-xs text-slate-500">
                Choose the visual animation applied to the static news image.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {MOTION_EFFECTS.map((eff) => {
                const isSelected = effect === eff.id;
                return (
                  <div
                    key={eff.id}
                    onClick={() => setEffect(eff.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-rose-50/50 border-rose-500 ring-2 ring-rose-400/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-[#F8F9FD]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span className="text-base">{eff.icon}</span>
                        <span>{eff.name}</span>
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {eff.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{eff.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Background Music Engine */}
          <div className="p-5 rounded-2xl bg-white border border-[#EEF1F6] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Music className="w-4 h-4 text-blue-600" />
                  <span>Background Music (.mp3)</span>
                </label>
                <p className="text-xs text-slate-500">
                  Audio is auto-trimmed to exactly {duration}s with a smooth 1.5s fade-out at the end.
                </p>
              </div>

              {/* Upload Custom Audio Button */}
              <div>
                <input
                  type="file"
                  ref={audioInputRef}
                  accept="audio/*,.mp3,.wav,.m4a"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={uploadingAudio}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingAudio ? 'Uploading...' : 'Upload Music (.mp3)'}</span>
                </button>
              </div>
            </div>

            {audioError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{audioError}</span>
              </div>
            )}

            {/* Currently Active Music Card */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 overflow-hidden">
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="truncate">
                  <div className="text-xs font-extrabold truncate">{musicName || 'No track selected'}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{musicUrl}</div>
                </div>
              </div>

              {/* Hidden audio element for preview */}
              {musicUrl && (
                <audio
                  ref={audioPreviewRef}
                  src={musicUrl}
                  onEnded={() => setIsPlayingAudio(false)}
                />
              )}
            </div>

            {/* Preset Tracks */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                Or choose from built-in royalty-free news beats:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRESET_MUSIC_TRACKS.map((t) => (
                  <button
                    key={t.url}
                    type="button"
                    onClick={() => {
                      setMusicUrl(t.url);
                      setMusicName(t.name);
                      if (isPlayingAudio && audioPreviewRef.current) {
                        audioPreviewRef.current.pause();
                        setIsPlayingAudio(false);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      musicUrl === t.url
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900'
                        : 'border-slate-200 bg-[#F8F9FD] text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="truncate">{t.name}</div>
                    <div className="text-[9px] text-slate-400 font-normal">{t.genre}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 9:16 Live Phone Reel Mockup Player (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-6 w-full max-w-[340px] space-y-3">
            {/* Phone Frame */}
            <div className="relative aspect-[9/16] w-full rounded-[38px] bg-black p-3.5 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700 flex flex-col justify-between overflow-hidden">
              {/* iPhone Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4.5 bg-black rounded-full z-20 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-950" />
              </div>

              {/* Video Player or Static Poster */}
              <div className="relative w-full h-full rounded-[28px] overflow-hidden bg-slate-950 flex items-center justify-center">
                {generatedVideoUrl ? (
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        sampleImageUrl ||
                        currentTemplate?.templateImageUrl ||
                        'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1080&h=1920&fit=crop&q=80'
                      }
                      alt="Sample Frame"
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />

                    <div className="relative z-10 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center mx-auto shadow-lg animate-pulse">
                        <Film className="w-6 h-6" />
                      </div>
                      <div className="text-white text-xs font-black">Reel Preview Ready</div>
                      <p className="text-[11px] text-slate-300">
                        Click &ldquo;Generate Reel Preview&rdquo; below to render with real motion &amp; music.
                      </p>
                    </div>
                  </div>
                )}

                {/* Live Effect Watermark Badge */}
                <div className="absolute top-8 left-4 z-10 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/10">
                  <span>{MOTION_EFFECTS.find((m) => m.id === effect)?.icon}</span>
                  <span>{MOTION_EFFECTS.find((m) => m.id === effect)?.name}</span>
                  <span className="text-rose-400 font-mono">({duration}s)</span>
                </div>
              </div>
            </div>

            {/* Reel Action Buttons */}
            <div className="space-y-2 w-full">
              <button
                type="button"
                onClick={handleGenerateReelPreview}
                disabled={isGeneratingReel}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-60"
              >
                {isGeneratingReel ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering 1080×1920 Reel with FFmpeg...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>🎬 Generate Real Reel Preview</span>
                  </>
                )}
              </button>

              {generatedVideoUrl && (
                <a
                  href={generatedVideoUrl}
                  download={`reel_${currentTemplate.id}.mp4`}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    Download Reel ({generatedVideoSize ? Math.round(generatedVideoSize / 1024) + ' KB' : '.mp4'})
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
