import React from 'react';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { SigTemplate } from '@/types';

export interface GenerateCardOptions {
  headline: string;
  featuredImageUrl?: string;
  template?: SigTemplate | null;
  category?: string;
  siteName?: string;
}

/**
 * Pre-fetch image URL and convert to Base64 data URL with Sharp normalization.
 * Satori / Next.js ImageResponse strictly supports standard JPEG and PNG (NOT AVIF).
 * Sharp automatically normalizes AVIF, WebP, etc. into high-quality JPEG/PNG buffers.
 */
async function fetchImageAsBase64(url?: string, timeoutMs: number = 8000): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Handle data URIs
  if (trimmed.startsWith('data:image/')) {
    if (trimmed.startsWith('data:image/avif') || trimmed.startsWith('data:image/webp')) {
      try {
        const base64Data = trimmed.split(',')[1];
        if (base64Data) {
          const rawBuf = Buffer.from(base64Data, 'base64');
          const jpegBuf = await sharp(rawBuf).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
          return `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;
        }
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(trimmed, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[server-image-generator] Failed to fetch image: ${trimmed} (HTTP ${res.status})`);
      return null;
    }

    const rawBuffer = Buffer.from(await res.arrayBuffer());

    // Normalize image format with Sharp to 100% standard JPEG buffer (or PNG for transparent frames)
    try {
      const isPng =
        trimmed.toLowerCase().includes('.png') ||
        (res.headers.get('content-type') || '').toLowerCase().includes('png');

      if (isPng) {
        // Keep alpha channel for PNG frames/templates
        const pngBuf = await sharp(rawBuffer).png().toBuffer();
        return `data:image/png;base64,${pngBuf.toString('base64')}`;
      } else {
        const jpegBuf = await sharp(rawBuffer).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
        return `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;
      }
    } catch (sharpErr) {
      console.warn(`[server-image-generator] Sharp normalize fallback for ${trimmed}:`, sharpErr);
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${rawBuffer.toString('base64')}`;
    }
  } catch (err) {
    console.error(`[server-image-generator] Network error fetching ${trimmed}:`, err);
    return null;
  }
}

/**
 * Generate a high-resolution composite branded news card on the server using Next.js ImageResponse.
 * Overlays the post headline, category badge, and template frame on top of the featured image.
 * Returns a Base64 data URL: "data:image/png;base64,..."
 */
export async function generateServerCardImage(options: GenerateCardOptions): Promise<string> {
  const { headline, featuredImageUrl, template, category, siteName } = options;

  const width = template?.canvasWidth || 1200;
  const height = template?.canvasHeight || 630;

  const fBox = template?.featuredImageBox || {
    x: 0,
    y: 0,
    width,
    height: Math.round(height * 0.68),
    borderRadius: 0,
  };

  const tBox = template?.titleBox || {
    x: 40,
    y: Math.round(height * 0.68),
    width: width - 80,
    height: Math.round(height * 0.28),
    fontSize: 44,
    lineHeight: 1.35,
    textColor: '#FFFFFF',
    highlightColor: '#FBBF24',
    fontFamily: 'Noto Sans Devanagari',
    alignment: 'left',
  };

  // Pre-fetch both featured image and template PNG frame in parallel with timeout
  const [photoBase64, templateBase64] = await Promise.all([
    fetchImageAsBase64(featuredImageUrl, 8000),
    template?.templateImageUrl ? fetchImageAsBase64(template.templateImageUrl, 8000) : Promise.resolve(null),
  ]);

  console.log(
    `[server-image-generator] Card generation: headline="${headline.slice(0, 35)}...", photo=${
      photoBase64 ? 'OK' : 'MISSING'
    }, template=${templateBase64 ? 'OK' : 'NONE'}, mode=${template?.layerMode || 'overlay'}`
  );

  const children: React.ReactElement[] = [];

  // 1. Base dark background
  children.push(
    React.createElement('div', {
      key: 'base_dark_bg',
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#0b0f19',
        display: 'flex',
      },
    })
  );

  const layerMode = template?.layerMode || 'overlay';

  // Helper to build photo element
  const photoElement = photoBase64
    ? React.createElement('img', {
        key: 'featured_photo',
        src: photoBase64,
        style: {
          position: 'absolute',
          top: fBox.y,
          left: fBox.x,
          width: fBox.width,
          height: fBox.height,
          objectFit: 'cover',
          borderRadius: fBox.borderRadius || 0,
        },
      })
    : React.createElement(
        'div',
        {
          key: 'fallback_photo_box',
          style: {
            position: 'absolute',
            top: fBox.y,
            left: fBox.x,
            width: fBox.width,
            height: fBox.height,
            backgroundImage: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: fBox.borderRadius || 0,
          },
        },
        React.createElement(
          'span',
          {
            style: {
              color: '#475569',
              fontSize: 32,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: 2,
            },
          },
          siteName || 'News Article'
        )
      );

  // Helper to build template element
  const templateElement = templateBase64
    ? React.createElement('img', {
        key: 'template_frame',
        src: templateBase64,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        },
      })
    : null;

  // Layer ordering according to template mode
  if (layerMode === 'background') {
    // Template is behind the photo
    if (templateElement) children.push(templateElement);
    children.push(photoElement);
  } else {
    // Default 'overlay': Photo is in its bounding box, transparent template frame is on top
    children.push(photoElement);
    if (templateElement) children.push(templateElement);
  }

  // 4. Subtle scrim ONLY if no custom template was uploaded (prevents covering photo on custom branded templates)
  if (!templateBase64) {
    children.push(
      React.createElement('div', {
        key: 'text_contrast_scrim',
        style: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: Math.max(260, Math.round(height * 0.48)),
          backgroundImage:
            'linear-gradient(to top, rgba(11,15,25,1) 0%, rgba(11,15,25,0.92) 55%, transparent 100%)',
          display: 'flex',
        },
      })
    );
  }

  // 5. Title Box with Headline (No category badge overlay as requested)
  children.push(
    React.createElement(
      'div',
      {
        key: 'title_container',
        style: {
          position: 'absolute',
          top: tBox.y,
          left: tBox.x,
          width: tBox.width,
          height: tBox.height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 12px',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            fontSize: tBox.fontSize || 42,
            lineHeight: tBox.lineHeight || 1.35,
            color: tBox.textColor || '#ffffff',
            fontWeight: 'bold',
            textAlign: (tBox.alignment as any) || 'left',
            textShadow: '0 4px 16px rgba(0,0,0,0.95)',
            display: 'flex',
          },
        },
        headline
      )
    )
  );

  const container = React.createElement(
    'div',
    {
      style: {
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        overflow: 'hidden',
      },
    },
    children
  );

  const res = new ImageResponse(container, { width, height });
  const buf = await res.arrayBuffer();
  return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;
}
