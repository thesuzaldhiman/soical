import { NextRequest, NextResponse } from 'next/server';
import { generateServerVideoReel } from '@/lib/services/server-video-generator';
import { VideoMotionEffect } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      imageBase64,
      duration = 15,
      effect = 'shake',
      musicUrl,
      outputFilename,
    } = body;

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { success: false, error: 'Either imageUrl or imageBase64 is required.' },
        { status: 400 }
      );
    }

    const result = await generateServerVideoReel({
      imageUrl,
      imageBase64,
      durationSeconds: Number(duration) || 15,
      effect: (effect as VideoMotionEffect) || 'shake',
      musicUrl,
      outputFilename,
    });

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      duration: result.duration,
      sizeBytes: result.sizeBytes,
      effect: result.effect,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Video generation failed';
    console.error('[API Video Generate] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
