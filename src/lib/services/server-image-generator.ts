import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { SigTemplate } from '@/types';
import { getMediaFromDb } from '@/lib/db/mysql';

export interface GenerateCardOptions {
  headline: string;
  subtitle?: string;
  featuredImageUrl?: string;
  template?: SigTemplate | null;
  category?: string;
  siteName?: string;
}

const fontCache: Record<string, string> = {};

function getFontBase64(fontFamily?: string): { name: string; base64: string } {
  const cleanFamily = (fontFamily || '').trim().replace(/['"]/g, '');
  const fontFileMap: Record<string, string> = {
    'noto sans devanagari': 'NotoSansDevanagari-Bold.ttf',
    'khand': 'Khand-Bold.ttf',
    'mukta': 'Mukta-Bold.ttf',
    'hind': 'Hind-Bold.ttf',
    'kalam': 'Kalam-Bold.ttf',
    'poppins': 'Poppins-Bold.ttf',
    'teko': 'Teko-Bold.ttf',
    'rajdhani': 'Rajdhani-Bold.ttf',
    'rozha one': 'RozhaOne-Regular.ttf',
    'tiro devanagari hindi': 'TiroDevanagariHindi-Regular.ttf',
  };

  const matchedFile = fontFileMap[cleanFamily.toLowerCase()] || 'NotoSansDevanagari-Bold.ttf';
  const fontName = cleanFamily || 'Noto Sans Devanagari';

  if (fontCache[matchedFile]) {
    return { name: fontName, base64: fontCache[matchedFile] };
  }

  const fontPaths = [
    path.join(process.cwd(), 'public', 'fonts', matchedFile),
    path.join(process.cwd(), 'fonts', matchedFile),
    path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Bold.ttf'),
  ];

  for (const fp of fontPaths) {
    if (fs.existsSync(fp)) {
      try {
        const b64 = fs.readFileSync(fp).toString('base64');
        fontCache[matchedFile] = b64;
        return { name: fontName, base64: b64 };
      } catch {}
    }
  }

  return { name: fontName, base64: '' };
}

/**
 * Fetch image URL / local file / DB media and convert to raw Buffer
 */
async function fetchImageBuffer(url?: string, timeoutMs: number = 8000): Promise<Buffer | null> {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Data URI
  if (trimmed.startsWith('data:image/')) {
    try {
      const base64Data = trimmed.split(',')[1];
      if (base64Data) {
        return Buffer.from(base64Data, 'base64');
      }
    } catch {
      return null;
    }
  }

  // 2. Local uploads path
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
          return fs.readFileSync(cand);
        } catch {}
      }
    }

    try {
      const dbMedia = (await getMediaFromDb(filename)) || (await getMediaFromDb(cleanPath));
      if (dbMedia && dbMedia.data) {
        return dbMedia.data;
      }
    } catch {}
  }

  // 3. Remote URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('/uploads/')) {
      try {
        const parsedUrl = new URL(trimmed);
        const filename = path.basename(parsedUrl.pathname);
        const localFile = path.join(process.cwd(), 'public', 'uploads', filename);
        if (fs.existsSync(localFile)) {
          return fs.readFileSync(localFile);
        }
        const dbMedia = await getMediaFromDb(filename);
        if (dbMedia && dbMedia.data) {
          return dbMedia.data;
        }
      } catch {}
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(trimmed, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });
      clearTimeout(timer);

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch {}
  }

  return null;
}

/**
 * Intelligent line wrapping for Devanagari text based on pixel width and character count
 */
function wrapHeadline(text: string, boxWidth: number, fontSize: number): string[] {
  const charWidth = fontSize * 0.55;
  const maxChars = Math.max(10, Math.floor(boxWidth / charWidth));
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = '';

  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur.trim());
  return lines;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * High-performance, 100% Devanagari HarfBuzz-accurate image composer using Sharp.
 * Accurately renders Hindi ligatures, matras (ि, ी, ु, ू, etc.), and half-letters with custom font.
 */
export async function generateServerCardImage(options: GenerateCardOptions): Promise<string> {
  const { headline, featuredImageUrl, template, siteName } = options;

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

  const [photoBuf, templateBuf] = await Promise.all([
    fetchImageBuffer(featuredImageUrl, 8000),
    template?.templateImageUrl ? fetchImageBuffer(template.templateImageUrl, 8000) : Promise.resolve(null),
  ]);

  const layers: Array<{ input: Buffer; top?: number; left?: number }> = [];

  // 1. Process Featured Photo
  if (photoBuf) {
    try {
      const resizedPhoto = await sharp(photoBuf)
        .resize(fBox.width, fBox.height, { fit: 'cover', position: 'center' })
        .png()
        .toBuffer();

      layers.push({
        input: resizedPhoto,
        top: Math.round(fBox.y),
        left: Math.round(fBox.x),
      });
    } catch (photoErr) {
      console.warn('[server-image-generator] Failed processing photo with Sharp:', photoErr);
    }
  } else {
    // Fallback photo banner box
    const fallbackBox = await sharp({
      create: {
        width: fBox.width,
        height: fBox.height,
        channels: 4,
        background: { r: 30, g: 41, b: 59, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    layers.push({
      input: fallbackBox,
      top: Math.round(fBox.y),
      left: Math.round(fBox.x),
    });
  }

  // 2. Process Template Frame (PNG Overlay)
  if (templateBuf) {
    try {
      const resizedTemplate = await sharp(templateBuf)
        .resize(width, height, { fit: 'cover' })
        .png()
        .toBuffer();

      const layerMode = template?.layerMode || 'overlay';
      if (layerMode === 'background') {
        layers.unshift({
          input: resizedTemplate,
          top: 0,
          left: 0,
        });
      } else {
        layers.push({
          input: resizedTemplate,
          top: 0,
          left: 0,
        });
      }
    } catch (tmplErr) {
      console.warn('[server-image-generator] Failed processing template frame with Sharp:', tmplErr);
    }
  } else {
    // Subtle scrim gradient if no custom template frame
    const scrimHeight = Math.max(260, Math.round(height * 0.48));
    const scrimSvg = `<svg width="${width}" height="${scrimHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="scrim" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#0b0f19" stop-opacity="1" />
          <stop offset="65%" stop-color="#0b0f19" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#0b0f19" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#scrim)" />
    </svg>`;

    layers.push({
      input: Buffer.from(scrimSvg),
      top: height - scrimHeight,
      left: 0,
    });
  }

  // 3. Multi-line Hindi Headline & Subtitle via SVG with Embedded Devanagari HarfBuzz Font
  const activeFont = getFontBase64(tBox.fontFamily);
  const fontSize = tBox.fontSize || 44;
  const lineHeight = fontSize * (tBox.lineHeight || 1.35);
  const headlineLines = wrapHeadline(headline, tBox.width, fontSize);

  const subFontSize = Math.round(fontSize * 0.62);
  const subLineHeight = subFontSize * 1.3;
  const subtitleLines =
    options.subtitle && options.subtitle.trim()
      ? wrapHeadline(options.subtitle.trim(), tBox.width, subFontSize)
      : [];

  const totalTextHeight =
    headlineLines.length * lineHeight +
    (subtitleLines.length > 0 ? subtitleLines.length * subLineHeight + 10 : 0);
  const startY = tBox.y + fontSize + Math.max(0, (tBox.height - totalTextHeight) / 2);

  const headlineTspans = headlineLines
    .map((line, idx) => {
      let xCoord = tBox.x;
      let anchor = 'start';
      if (tBox.alignment === 'center') {
        xCoord = tBox.x + tBox.width / 2;
        anchor = 'middle';
      } else if (tBox.alignment === 'right') {
        xCoord = tBox.x + tBox.width;
        anchor = 'end';
      }
      return `<tspan x="${Math.round(xCoord)}" dy="${idx === 0 ? 0 : Math.round(lineHeight)}" text-anchor="${anchor}">${escapeXml(
        line
      )}</tspan>`;
    })
    .join('');

  const subtitleTspans = subtitleLines
    .map((line, idx) => {
      let xCoord = tBox.x;
      let anchor = 'start';
      if (tBox.alignment === 'center') {
        xCoord = tBox.x + tBox.width / 2;
        anchor = 'middle';
      } else if (tBox.alignment === 'right') {
        xCoord = tBox.x + tBox.width;
        anchor = 'end';
      }
      const dy = idx === 0 ? Math.round(lineHeight * 0.8 + 8) : Math.round(subLineHeight);
      return `<tspan x="${Math.round(xCoord)}" dy="${dy}" text-anchor="${anchor}" class="subtitle-text">${escapeXml(
        line
      )}</tspan>`;
    })
    .join('');

  const fontFaceCss = activeFont.base64
    ? `@font-face {
        font-family: 'DevanagariHeadlineFont';
        src: url('data:font/truetype;charset=utf-8;base64,${activeFont.base64}') format('truetype');
        font-weight: bold;
      }`
    : '';

  const textOverlaySvg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        ${fontFaceCss}
        .headline-text {
          font-family: 'DevanagariHeadlineFont', 'Noto Sans Devanagari', sans-serif;
          font-size: ${fontSize}px;
          font-weight: bold;
          fill: ${tBox.textColor || '#FFFFFF'};
          filter: drop-shadow(0px 3px 8px rgba(0, 0, 0, 0.95));
        }
        .subtitle-text {
          font-family: 'DevanagariHeadlineFont', 'Noto Sans Devanagari', sans-serif;
          font-size: ${subFontSize}px;
          font-weight: 600;
          fill: ${tBox.highlightColor || '#FBBF24'};
          filter: drop-shadow(0px 2px 6px rgba(0, 0, 0, 0.9));
        }
      </style>
    </defs>
    <text x="${Math.round(tBox.x)}" y="${Math.round(startY)}" class="headline-text">${headlineTspans}${subtitleTspans}</text>
  </svg>`;

  layers.push({
    input: Buffer.from(textOverlaySvg),
    top: 0,
    left: 0,
  });

  // Base canvas background
  const baseCanvas = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 11, g: 15, b: 25, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const finalCardBuffer = await sharp(baseCanvas)
    .composite(layers)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  return `data:image/jpeg;base64,${finalCardBuffer.toString('base64')}`;
}
