import { NextRequest, NextResponse } from 'next/server';
import { generateServerVideoReel } from '@/lib/services/server-video-generator';
import { VideoMotionEffect, VideoOverlayType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      imageBase64,
      canvasWidth,
      canvasHeight,
      duration = 15,
      durationSeconds,
      effect = 'subtle_float',
      effects,
      effectDurationSeconds,
      motionIntensity,
      overlays = [],
      overlayIntensity,
      musicUrl,
      musicVolume = 100,
      outputFilename,
    } = body;

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { success: false, error: 'Either imageUrl or imageBase64 is required.' },
        { status: 400 }
      );
    }

    const finalDuration = Number(durationSeconds || duration) || 15;

    const result = await generateServerVideoReel({
      imageUrl,
      imageBase64,
      canvasWidth: Number(canvasWidth) || 1080,
      canvasHeight: Number(canvasHeight) || 1920,
      durationSeconds: finalDuration,
      effect: (effect as VideoMotionEffect) || 'subtle_float',
      effects: Array.isArray(effects) ? (effects as VideoMotionEffect[]) : undefined,
      effectDurationSeconds: effectDurationSeconds ? Number(effectDurationSeconds) : undefined,
      motionIntensity: motionIntensity !== undefined ? Number(motionIntensity) : 20,
      overlays: Array.isArray(overlays) ? (overlays as VideoOverlayType[]) : [],
      overlayIntensity: overlayIntensity !== undefined ? Number(overlayIntensity) : 50,
      musicUrl,
      musicVolume: Number(musicVolume) || 100,
      outputFilename,
    });

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      duration: result.duration,
      sizeBytes: result.sizeBytes,
      effect: result.effect,
      effects: result.effects,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Video generation failed';
    console.error('[API Video Generate] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
