import { SigTemplate } from '@/types';

export interface ComposeCardOptions {
  template: SigTemplate;
  headline: string;
  highlightPhrase?: string;
  featuredImageUrl?: string;
  fallbackTextColor?: string;
}

/**
 * Composite a complete branded News Card onto an HTML Canvas
 * Matches Social Image Generator (SIG) functionality from user plugin.
 */
export async function renderTemplateToCanvas(
  canvas: HTMLCanvasElement,
  options: ComposeCardOptions
): Promise<string> {
  const { template, headline, highlightPhrase = '', featuredImageUrl = '' } = options;

  const width = template.canvasWidth || 1200;
  const height = template.canvasHeight || 630;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // 1. Draw Template Background PNG
  if (template.templateImageUrl) {
    try {
      const bgImg = await loadImageAsync(template.templateImageUrl);
      ctx.drawImage(bgImg, 0, 0, width, height);
    } catch {
      // Fallback dark gradient background
      drawFallbackBackground(ctx, width, height);
    }
  } else {
    drawFallbackBackground(ctx, width, height);
  }

  // 2. Draw Featured Image in Featured Image Box
  const fBox = template.featuredImageBox || {
    x: 0,
    y: 0,
    width: width,
    height: Math.round(height * 0.65),
  };

  if (featuredImageUrl) {
    try {
      const fImg = await loadImageAsync(featuredImageUrl);
      ctx.save();

      // Rounded rectangle clipping if borderRadius specified
      if (fBox.borderRadius && fBox.borderRadius > 0) {
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(fBox.x, fBox.y, fBox.width, fBox.height, fBox.borderRadius);
        } else {
          ctx.rect(fBox.x, fBox.y, fBox.width, fBox.height);
        }
        ctx.clip();
      }

      // Draw with cover crop
      drawImageCover(ctx, fImg, fBox.x, fBox.y, fBox.width, fBox.height);
      ctx.restore();
    } catch {
      // Draw placeholder inside fBox
      ctx.save();
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(fBox.x, fBox.y, fBox.width, fBox.height);
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🖼️ News Photo', fBox.x + fBox.width / 2, fBox.y + fBox.height / 2);
      ctx.restore();
    }
  }

  // 3. Draw Title & Headline in Title Box
  const tBox = template.titleBox || {
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

  renderHeadlineInsideBox(ctx, headline, highlightPhrase, tBox);

  return canvas.toDataURL('image/jpeg', 0.92);
}

function drawFallbackBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0F172A');
  grad.addColorStop(0.7, '#1E293B');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function loadImageAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Draws image with 'cover' aspect ratio fitting inside target rectangle
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;

  let sx = 0,
    sy = 0,
    sw = img.naturalWidth,
    sh = img.naturalHeight;

  if (imgRatio > boxRatio) {
    // Image is wider than box -> crop sides
    sw = img.naturalHeight * boxRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    // Image is taller than box -> crop top/bottom
    sh = img.naturalWidth / boxRatio;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/**
 * Wraps and draws headline text inside the title box with dual-color highlight support
 */
function renderHeadlineInsideBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  highlightPhrase: string,
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize?: number;
    lineHeight?: number;
    textColor?: string;
    highlightColor?: string;
    fontFamily?: string;
    alignment?: 'left' | 'center' | 'right';
  }
) {
  const fontSize = box.fontSize || 42;
  const lineHeightRatio = box.lineHeight || 1.35;
  const lineHeight = fontSize * lineHeightRatio;
  const textColor = box.textColor || '#FFFFFF';
  const highlightColor = box.highlightColor || '#FBBF24';
  const fontFamily = box.fontFamily || 'Noto Sans Devanagari';
  const alignment = box.alignment || 'left';

  ctx.save();
  ctx.font = `bold ${fontSize}px "${fontFamily}", "Poppins", sans-serif`;

  // Split text into words for wrapping
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > box.width && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Calculate starting Y position
  const totalTextHeight = lines.length * lineHeight;
  const startY = box.y + fontSize + Math.max(0, (box.height - totalTextHeight) / 2);

  lines.forEach((line, lineIdx) => {
    const y = startY + lineIdx * lineHeight;
    const lineWidth = ctx.measureText(line).width;

    let startX = box.x;
    if (alignment === 'center') {
      startX = box.x + (box.width - lineWidth) / 2;
    } else if (alignment === 'right') {
      startX = box.x + (box.width - lineWidth);
    }

    // Check if line contains highlight phrase
    const cleanHighlight = highlightPhrase.trim();
    if (cleanHighlight && line.includes(cleanHighlight)) {
      const parts = line.split(cleanHighlight);
      let curX = startX;

      // Prefix before highlight
      if (parts[0]) {
        ctx.fillStyle = textColor;
        ctx.fillText(parts[0], curX, y);
        curX += ctx.measureText(parts[0]).width;
      }

      // Highlight phrase
      ctx.fillStyle = highlightColor;
      ctx.fillText(cleanHighlight, curX, y);
      curX += ctx.measureText(cleanHighlight).width;

      // Suffix after highlight
      if (parts[1]) {
        ctx.fillStyle = textColor;
        ctx.fillText(parts[1], curX, y);
      }
    } else {
      ctx.fillStyle = textColor;
      ctx.fillText(line, startX, y);
    }
  });

  ctx.restore();
}
