import { NextRequest, NextResponse } from 'next/server';
import { generateServerVideoReel } from '@/lib/services/server-video-generator';
import { VideoMotionEffect, VideoOverlayType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      imageBase64,
      duration = 15,
      durationSeconds,
      effect = 'shake',
      effects,
      effectDurationSeconds,
      overlays = [],
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
      durationSeconds: finalDuration,
      effect: (effect as VideoMotionEffect) || 'shake',
      effects: Array.isArray(effects) ? (effects as VideoMotionEffect[]) : undefined,
      effectDurationSeconds: effectDurationSeconds ? Number(effectDurationSeconds) : undefined,
      overlays: Array.isArray(overlays) ? (overlays as VideoOverlayType[]) : [],
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
