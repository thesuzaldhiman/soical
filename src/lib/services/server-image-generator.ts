import React from 'react';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { SigTemplate } from '@/types';
import { getMediaFromDb } from '@/lib/db/mysql';

export interface GenerateCardOptions {
  headline: string;
  featuredImageUrl?: string;
  template?: SigTemplate | null;
  category?: string;
  siteName?: string;
}

let cachedDevanagariFont: Buffer | null = null;

function getDevanagariFontBuffer(): Buffer | null {
  if (cachedDevanagariFont) return cachedDevanagariFont;
  const fontCandidates = [
    path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Bold.ttf'),
    path.join(process.cwd(), 'fonts', 'NotoSansDevanagari-Bold.ttf'),
  ];
  for (const fp of fontCandidates) {
    if (fs.existsSync(fp)) {
      try {
        cachedDevanagariFont = fs.readFileSync(fp);
        return cachedDevanagariFont;
      } catch {}
    }
  }
  return null;
}

/**
 * Pre-fetch image URL / local file / DB media and convert to Base64 data URL with Sharp normalization.
 * Satori / Next.js ImageResponse strictly supports standard JPEG and PNG (NOT AVIF / WebP directly).
 * Sharp automatically normalizes AVIF, WebP, etc. into high-quality JPEG/PNG buffers.
 */
async function fetchImageAsBase64(url?: string, timeoutMs: number = 8000): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Handle data URIs
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

  let rawBuffer: Buffer | null = null;
  let isPng = false;

  // 2. Check if local file or uploads path
  const isUploadsPath =
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('uploads/') ||
    trimmed.startsWith('/public/') ||
    trimmed.startsWith('public/') ||
    trimmed.includes('/uploads/') ||
    !trimmed.startsWith('http');

  if (isUploadsPath) {
    const cleanPath = trimmed.replace(/^\/+/, '');
    const filename = path.basename(cleanPath.split('?')[0]);

    const diskCandidates = [
      path.join(process.cwd(), 'public', 'uploads', filename),
      path.join(process.cwd(), 'public', cleanPath),
      path.join(process.cwd(), cleanPath),
      path.join(process.cwd(), '..', cleanPath),
    ];

    for (const cand of diskCandidates) {
      if (fs.existsSync(cand)) {
        try {
          rawBuffer = fs.readFileSync(cand);
          isPng = cand.toLowerCase().endsWith('.png');
          break;
        } catch {}
      }
    }

    // Fallback to MySQL app_media_storage if not on disk (e.g. after cloud redeploy)
    if (!rawBuffer) {
      try {
        const dbMedia = (await getMediaFromDb(filename)) || (await getMediaFromDb(cleanPath));
        if (dbMedia && dbMedia.data) {
          rawBuffer = dbMedia.data;
          isPng =
            (dbMedia.mimeType || '').toLowerCase().includes('png') ||
            filename.toLowerCase().endsWith('.png');
        }
      } catch (dbErr) {
        console.warn(`[server-image-generator] MySQL media lookup warning for ${trimmed}:`, dbErr);
      }
    }
  }

  // 3. Remote URL (http:// or https://)
  if (!rawBuffer && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
    // If it points to our own uploads endpoint, avoid network loopback and check disk/DB directly
    if (trimmed.includes('/uploads/')) {
      try {
        const parsedUrl = new URL(trimmed);
        const filename = path.basename(parsedUrl.pathname);
        const localFile = path.join(process.cwd(), 'public', 'uploads', filename);
        if (fs.existsSync(localFile)) {
          rawBuffer = fs.readFileSync(localFile);
          isPng = filename.toLowerCase().endsWith('.png');
        }
        if (!rawBuffer) {
          const dbMedia = await getMediaFromDb(filename);
          if (dbMedia && dbMedia.data) {
            rawBuffer = dbMedia.data;
            isPng =
              (dbMedia.mimeType || '').toLowerCase().includes('png') ||
              filename.toLowerCase().endsWith('.png');
          }
        }
      } catch {}
    }

    // If still not resolved, fetch from network
    if (!rawBuffer) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(trimmed, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/png,image/jpeg,image/*,*/*;q=0.8',
          },
        });
        clearTimeout(timeout);

        if (res.ok) {
          rawBuffer = Buffer.from(await res.arrayBuffer());
          isPng =
            trimmed.toLowerCase().includes('.png') ||
            (res.headers.get('content-type') || '').toLowerCase().includes('png');
        } else {
          console.warn(`[server-image-generator] Failed to fetch remote image: ${trimmed} (HTTP ${res.status})`);
        }
      } catch (err) {
        console.error(`[server-image-generator] Network error fetching ${trimmed}:`, err);
      }
    }
  }

  if (!rawBuffer) return null;

  // 4. Normalize image format with Sharp to 100% standard JPEG buffer (or PNG for transparent frames)
  try {
    const meta = await sharp(rawBuffer).metadata();
    if (meta.hasAlpha || isPng) {
      const pngBuf = await sharp(rawBuffer).png({ compressionLevel: 8 }).toBuffer();
      return `data:image/png;base64,${pngBuf.toString('base64')}`;
    } else {
      const jpegBuf = await sharp(rawBuffer).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
      return `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;
    }
  } catch (sharpErr) {
    console.warn(`[server-image-generator] Sharp normalize fallback for ${trimmed}:`, sharpErr);
    return `data:${isPng ? 'image/png' : 'image/jpeg'};base64,${rawBuffer.toString('base64')}`;
  }
}

/**
 * Generate a high-resolution composite branded news card on the server using Next.js ImageResponse.
 * Layer 1 (Bottom): Featured Photo inside featuredImageBox
 * Layer 2 (Middle): Transparent PNG template frame overlay on top of photo
 * Layer 3 (Top): Headline and Title text inside titleBox with Devanagari typography
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

  // Pre-fetch both featured image and template PNG frame in parallel
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

  // 2. Featured Photo Element
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

  // 3. Template Frame Element (Transparent PNG frame with branding/borders)
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

  // Layer ordering according to template mode:
  // Default 'overlay': Photo is in its bounding box (behind), transparent template frame sits on top!
  if (layerMode === 'background') {
    if (templateElement) children.push(templateElement);
    children.push(photoElement);
  } else {
    children.push(photoElement);
    if (templateElement) children.push(templateElement);
  }

  // 4. Subtle scrim ONLY if no custom template was uploaded
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

  // 5. Title Box with Headline (On top of both photo and template frame)
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
          padding: '0 16px',
        },
      },
      React.createElement(
        'span',
        {
          style: {
            fontSize: tBox.fontSize || 42,
            lineHeight: tBox.lineHeight || 1.35,
            color: tBox.textColor || '#ffffff',
            fontWeight: 700,
            textAlign: (tBox.alignment as any) || 'left',
            fontFamily: 'Noto Sans Devanagari',
            textShadow: '0 4px 16px rgba(0,0,0,0.95)',
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

  const devanagariFont = getDevanagariFontBuffer();
  const fontConfig: any[] = [];
  if (devanagariFont) {
    fontConfig.push({
      name: 'Noto Sans Devanagari',
      data: devanagariFont,
      weight: 700,
      style: 'normal',
    });
  }

  const res = new ImageResponse(container, {
    width,
    height,
    ...(fontConfig.length > 0 ? { fonts: fontConfig } : {}),
  });

  const buf = await res.arrayBuffer();
  return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;
}
