import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { SigTemplate } from '@/types';
import { getMediaFromDb } from '@/lib/db/mysql';
import { cleanHeadlineText } from '@/lib/utils/text-decoder';

export interface GenerateCardOptions {
  headline: string;
  subtitle?: string;
  highlightPhrase?: string;
  featuredImageUrl?: string;
  template?: SigTemplate | null;
  category?: string;
  siteName?: string;
}

let fontConfigInitialized = false;

function ensureFontsRegistered() {
  if (fontConfigInitialized) return;
  fontConfigInitialized = true;

  try {
    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    if (!fs.existsSync(fontsDir)) return;

    // Standard Linux font paths
    const homeDir = process.env.HOME || '/home/u941411339';
    const targetDirs = [
      path.join(homeDir, '.fonts'),
      path.join(homeDir, '.local', 'share', 'fonts'),
    ];

    for (const tdir of targetDirs) {
      try {
        if (!fs.existsSync(tdir)) {
          fs.mkdirSync(tdir, { recursive: true });
        }
        const files = fs.readdirSync(fontsDir);
        for (const file of files) {
          if (file.endsWith('.ttf') || file.endsWith('.otf')) {
            const src = path.join(fontsDir, file);
            const dst = path.join(tdir, file);
            if (!fs.existsSync(dst)) {
              fs.copyFileSync(src, dst);
            }
          }
        }
      } catch {}
    }

    // Set FONTCONFIG_PATH with custom fonts.conf
    const fcDir = path.join(process.cwd(), '.fontconfig');
    const fcCache = path.join(fcDir, 'cache');
    if (!fs.existsSync(fcCache)) {
      fs.mkdirSync(fcCache, { recursive: true });
    }

    const confContent = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontsDir}</dir>
  <dir>${path.join(homeDir, '.fonts')}</dir>
  <dir>${path.join(homeDir, '.local', 'share', 'fonts')}</dir>
  <cachedir>${fcCache}</cachedir>
  <config></config>
</fontconfig>`;

    const confPath = path.join(fcDir, 'fonts.conf');
    if (!fs.existsSync(confPath)) {
      fs.writeFileSync(confPath, confContent, 'utf8');
    }
    process.env.FONTCONFIG_PATH = fcDir;
  } catch (err) {
    console.warn('[server-image-generator] Font registration notice:', err);
  }
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
      let fetchUrl = trimmed;
      try {
        fetchUrl = new URL(trimmed).toString();
      } catch {
        fetchUrl = encodeURI(trimmed);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          Referer: 'https://khabarmonkey.com/',
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
  ensureFontsRegistered();

  const { subtitle, featuredImageUrl, template, siteName } = options;
  const headline = cleanHeadlineText(options.headline || '');
  const cleanSubtitle = subtitle ? cleanHeadlineText(subtitle) : undefined;

  const width = Math.max(300, template?.canvasWidth || 1200);
  const height = Math.max(300, template?.canvasHeight || 630);

  const rawFBox = template?.featuredImageBox || {
    x: 0,
    y: 0,
    width,
    height: Math.round(height * 0.68),
    borderRadius: 0,
  };

  // Safe Clamping for Featured Image Box (Prevents Sharp dimension overflow crashes)
  const safeBoxLeft = Math.max(0, Math.min(Math.round(rawFBox.x || 0), width - 20));
  const safeBoxTop = Math.max(0, Math.min(Math.round(rawFBox.y || 0), height - 20));
  const safeBoxWidth = Math.max(20, Math.min(Math.round(rawFBox.width || width), width - safeBoxLeft));
  const safeBoxHeight = Math.max(20, Math.min(Math.round(rawFBox.height || (height * 0.68)), height - safeBoxTop));

  const fBox = {
    x: safeBoxLeft,
    y: safeBoxTop,
    width: safeBoxWidth,
    height: safeBoxHeight,
    borderRadius: rawFBox.borderRadius || 0,
  };

  const rawTBox = template?.titleBox || {
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

  const safeTitleLeft = Math.max(0, Math.min(Math.round(rawTBox.x || 0), width - 20));
  const safeTitleTop = Math.max(0, Math.min(Math.round(rawTBox.y || 0), height - 20));
  const safeTitleWidth = Math.max(20, Math.min(Math.round(rawTBox.width || (width - safeTitleLeft)), width - safeTitleLeft));
  const safeTitleHeight = Math.max(20, Math.min(Math.round(rawTBox.height || (height * 0.28)), height - safeTitleTop));

  const tBox = {
    ...rawTBox,
    x: safeTitleLeft,
    y: safeTitleTop,
    width: safeTitleWidth,
    height: safeTitleHeight,
  };

  const [photoBuf, templateBuf] = await Promise.all([
    fetchImageBuffer(featuredImageUrl, 8000),
    template?.templateImageUrl ? fetchImageBuffer(template.templateImageUrl, 8000) : Promise.resolve(null),
  ]);

  const layers: Array<{ input: Buffer; top?: number; left?: number }> = [];

  // 1. Process Featured Photo
  let photoLayerItem: { input: Buffer; top: number; left: number } | null = null;
  if (photoBuf) {
    try {
      let resizedPhotoBuf: Buffer;
      const baseResize = sharp(photoBuf).resize(fBox.width, fBox.height, { fit: 'cover', position: 'center' });

      if (fBox.borderRadius && fBox.borderRadius > 0) {
        const r = Math.min(fBox.borderRadius, Math.floor(Math.min(fBox.width, fBox.height) / 2));
        const maskSvg = Buffer.from(
          `<svg width="${fBox.width}" height="${fBox.height}">
            <rect x="0" y="0" width="${fBox.width}" height="${fBox.height}" rx="${r}" ry="${r}" fill="#fff"/>
          </svg>`
        );
        const intermediatePng = await baseResize.png().toBuffer();
        resizedPhotoBuf = await sharp(intermediatePng)
          .composite([{ input: maskSvg, blend: 'dest-in' }])
          .png()
          .toBuffer();
      } else {
        resizedPhotoBuf = await baseResize.png().toBuffer();
      }

      photoLayerItem = {
        input: resizedPhotoBuf,
        top: Math.round(fBox.y),
        left: Math.round(fBox.x),
      };
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

    photoLayerItem = {
      input: fallbackBox,
      top: Math.round(fBox.y),
      left: Math.round(fBox.x),
    };
  }

  // 2. Process Template Frame
  let frameLayerItem: { input: Buffer; top: number; left: number } | null = null;
  if (templateBuf) {
    try {
      const resizedTemplate = await sharp(templateBuf)
        .resize(width, height, { fit: 'fill' })
        .png()
        .toBuffer();

      frameLayerItem = {
        input: resizedTemplate,
        top: 0,
        left: 0,
      };
    } catch (tmplErr) {
      console.warn('[server-image-generator] Failed processing template frame with Sharp:', tmplErr);
    }
  }

  // Layer Stacking Ordering:
  // 1. If layerMode === 'background':
  //    The template is a solid Background Card.
  //    The post's featured photo sits ON TOP of the background card.
  //    Order: Frame (bottom) -> Photo (top)
  //
  // 2. If layerMode === 'overlay' (Default for transparent PNG frames):
  //    The template is a transparent PNG Frame (with transparent cutout, borders, logos, and banners).
  //    The post's featured photo sits BEHIND the PNG frame cutout.
  //    Order: Photo (bottom) -> PNG Frame (top)
  const isBackgroundMode = template?.layerMode === 'background';

  if (isBackgroundMode) {
    if (frameLayerItem) layers.push(frameLayerItem);
    if (photoLayerItem) layers.push(photoLayerItem);
  } else {
    if (photoLayerItem) layers.push(photoLayerItem);
    if (frameLayerItem) layers.push(frameLayerItem);
  }

  if (!templateBuf) {
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
    cleanSubtitle && cleanSubtitle.trim()
      ? wrapHeadline(cleanSubtitle.trim(), tBox.width, subFontSize)
      : [];

  const totalTextHeight =
    headlineLines.length * lineHeight +
    (subtitleLines.length > 0 ? subtitleLines.length * subLineHeight + 10 : 0);
  const verticalAlignment = (tBox as any).verticalAlignment || 'center';
  let startY = tBox.y + fontSize * 0.9 + Math.max(0, (tBox.height - totalTextHeight) / 2);
  if (verticalAlignment === 'top') {
    startY = tBox.y + fontSize * 0.9 + 6;
  } else if (verticalAlignment === 'bottom') {
    startY = tBox.y + tBox.height - totalTextHeight + fontSize * 0.9 - 6;
  }

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
          font-family: 'Noto Sans Devanagari', 'Mukta', 'Hind', 'Tiro Devanagari Hindi', 'Khand', 'DevanagariHeadlineFont', sans-serif;
          font-size: ${fontSize}px;
          font-weight: bold;
          fill: ${tBox.textColor || '#FFFFFF'};
          filter: drop-shadow(0px 3px 8px rgba(0, 0, 0, 0.95));
        }
        .subtitle-text {
          font-family: 'Noto Sans Devanagari', 'Mukta', 'Hind', 'Tiro Devanagari Hindi', 'Khand', 'DevanagariHeadlineFont', sans-serif;
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

  // Base canvas background (respects template.backgroundColor if specified)
  let bgR = 11;
  let bgG = 15;
  let bgB = 25;
  if (template?.backgroundColor && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(template.backgroundColor)) {
    let hex = template.backgroundColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    bgR = parseInt(hex.substring(0, 2), 16);
    bgG = parseInt(hex.substring(2, 4), 16);
    bgB = parseInt(hex.substring(4, 6), 16);
  }

  const baseCanvas = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: bgR, g: bgG, b: bgB, alpha: 1 },
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
