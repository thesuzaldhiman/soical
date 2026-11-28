import { NextRequest, NextResponse } from 'next/server';
import { generateServerVideoReel } from '@/lib/services/server-video-generator';
import { generateServerCardImage, generateServerCardFrameLayer } from '@/lib/services/server-image-generator';
import { VideoMotionEffect, VideoOverlayType } from '@/types';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      imageBase64,
      frameOverlayBase64,
      featuredImageBase64,
      featuredImageUrl,
      featuredImageBox,
      layerMode,
      backgroundColor,
      template,
      headline,
      highlightPhrase,
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

    let finalImageBase64 = imageBase64;
    let finalImageUrl = imageUrl;
    let finalFrameOverlayBase64 = frameOverlayBase64;
    const resolvedFeaturedUrl = featuredImageUrl || template?.templateImageUrl;
    const resolvedFeaturedBox = featuredImageBox || template?.featuredImageBox;

    // Auto-generate stable Frame+Text overlay layer on server if client didn't pass one
    if (!finalFrameOverlayBase64 && template) {
      try {
        finalFrameOverlayBase64 = await generateServerCardFrameLayer({
          template,
          headline: headline || template.name || 'Breaking News',
          highlightPhrase,
          featuredImageUrl: resolvedFeaturedUrl,
        });
      } catch (frameErr) {
        console.warn('[API Video Generate] generateServerCardFrameLayer warning:', frameErr);
      }
    }

    if (!finalImageUrl && !finalImageBase64 && !(finalFrameOverlayBase64 && (featuredImageBase64 || featuredImageUrl))) {
      if (template) {
        try {
          console.log('[API Video Generate] No imageBase64 received, generating server card via Sharp fallback...');
          finalImageBase64 = await generateServerCardImage({
            template,
            headline: headline || template.name || 'Breaking News',
            highlightPhrase,
            featuredImageUrl: resolvedFeaturedUrl,
          });
        } catch (cardErr) {
          console.warn('[API Video Generate] generateServerCardImage error:', cardErr);
        }
      }
    }

    if (!finalImageUrl && !finalImageBase64 && !(finalFrameOverlayBase64 && (featuredImageBase64 || featuredImageUrl))) {
      return NextResponse.json(
        { success: false, error: 'Either imageUrl, imageBase64, or a valid template is required.' },
        { status: 400 }
      );
    }

    const finalDuration = Number(durationSeconds || duration) || 15;

    const result = await generateServerVideoReel({
      imageUrl: finalImageUrl,
      imageBase64: finalImageBase64,
      featuredImageBase64,
      featuredImageUrl: featuredImageUrl || undefined,
      frameOverlayBase64: finalFrameOverlayBase64 || undefined,
      layerMode: layerMode || template?.layerMode || 'overlay',
      backgroundColor: backgroundColor || template?.backgroundColor || '#0B0F19',
      featuredImageBox: resolvedFeaturedBox,
      canvasWidth: Number(canvasWidth) || template?.canvasWidth || 1080,
      canvasHeight: Number(canvasHeight) || template?.canvasHeight || 1920,
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
      renderMode: result.renderMode,
      ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {}),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Video generation failed';
    console.error('[API Video Generate] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
