import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { VideoOverlayType } from '@/types';

export interface OverlayAssetLayer {
  filePath: string;
  kind: 'scroll_up' | 'scroll_down' | 'twinkle_fade' | 'static_vignette';
  padX: number;
  padY: number;
  speedY?: number;
  swayAmpX?: number;
  swayFreq?: number;
  fadePeriodSec?: number;
  fadeOffsetSec?: number;
}

// Fast deterministic PRNG so cached overlay textures remain consistent and natural
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getCacheDir(): string {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'tmp', 'ov_cache_v3');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function renderSvgToCachedPng(cacheKey: string, svg: string): Promise<string> {
  const dir = getCacheDir();
  const filePath = path.join(dir, `${cacheKey}.png`);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 200) {
    return filePath;
  }
  const pngBuffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 2 }).toBuffer();
  fs.writeFileSync(filePath, pngBuffer);
  return filePath;
}

function buildSeamlessDustSvg(
  targetW: number,
  targetH: number,
  ratio: number,
  layerVariant: 'fine' | 'bokeh'
): { svg: string; padX: number } {
  const padX = 64;
  const svgW = targetW + padX * 2;
  const svgH = targetH * 2; // Seamless vertical double tile
  const rand = mulberry32(layerVariant === 'fine' ? 104729 : 224737);

  const count =
    layerVariant === 'fine'
      ? Math.round(24 + 64 * ratio) // 24 to 88 delicate dust motes
      : Math.round(9 + 26 * ratio); // 9 to 35 soft foreground bokeh motes

  const opacityScale = 0.42 + 0.58 * ratio;
  const refScale = Math.max(0.6, targetW / 1080);

  let items = '';
  for (let i = 0; i < count; i++) {
    const cx = (padX * 0.4 + rand() * (targetW + padX * 1.2)).toFixed(1);
    const cy = (rand() * targetH).toFixed(1);
    const r =
      layerVariant === 'fine'
        ? ((2.0 + rand() * 4.5) * refScale).toFixed(1)
        : ((6.5 + rand() * 11.5) * refScale).toFixed(1);

    const toneRoll = rand();
    const gradId = toneRoll > 0.45 ? 'dustGold' : toneRoll > 0.18 ? 'dustWarm' : 'dustCool';
    const baseOp = layerVariant === 'fine' ? 0.35 + rand() * 0.55 : 0.22 + rand() * 0.38;
    const op = Math.min(0.95, baseOp * opacityScale).toFixed(2);

    items += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gradId})" opacity="${op}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">
    <defs>
      <radialGradient id="dustGold">
        <stop offset="0%" stop-color="#FFFBEB" stop-opacity="1"/>
        <stop offset="35%" stop-color="#FDE68A" stop-opacity="0.78"/>
        <stop offset="70%" stop-color="#F59E0B" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="dustWarm">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
        <stop offset="40%" stop-color="#FEF3C7" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="#FDE68A" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="dustCool">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
        <stop offset="45%" stop-color="#E2E8F0" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#CBD5E1" stop-opacity="0"/>
      </radialGradient>
      <g id="dustTile">${items}</g>
    </defs>
    <use href="#dustTile" y="0"/>
    <use href="#dustTile" y="${targetH}"/>
  </svg>`;

  return { svg, padX };
}

function buildTwinkleStarsSvg(
  targetW: number,
  targetH: number,
  ratio: number,
  layerIndex: number
): { svg: string; padX: number; padY: number } {
  const padX = 36;
  const padY = 36;
  const svgW = targetW + padX * 2;
  const svgH = targetH + padY * 2;
  const rand = mulberry32(918273 + layerIndex * 48271);

  const targetCount = Math.round(6 + 14 * ratio); // 6 to 20 well-spaced sleek sparkles per layer
  const dustCount = Math.round(10 + 18 * ratio); // Tiny diamond pinpoint specks
  const opacityScale = 0.55 + 0.45 * ratio;
  const refScale = Math.max(0.65, targetW / 1080);

  // Enforce clean minimum distance between stars so they never clump awkwardly
  const placed: Array<{ x: number; y: number }> = [];
  const minDist = Math.round(115 * refScale);

  let items = '';
  let attempts = 0;
  while (placed.length < targetCount && attempts < targetCount * 12) {
    attempts++;
    const cx = padX + 36 + rand() * (targetW - 72);
    const cy = padY + 36 + rand() * (targetH - 72);
    if (placed.some((p) => Math.hypot(p.x - cx, p.y - cy) < minDist)) {
      continue;
    }
    placed.push({ x: cx, y: cy });

    // Sleek, delicate optical lens flare sizing (never chunky!)
    const isHero = rand() > 0.62;
    const size = (isHero ? 16 + rand() * 14 : 9 + rand() * 9) * refScale * (0.78 + 0.32 * ratio);
    const rotDeg = Math.round(rand() * 20 - 10);
    const isGold = rand() > 0.35;
    const auraId = isGold ? 'starAuraGold' : 'starAuraWhite';
    const fillColor = isGold ? '#FEF9C3' : '#FFFFFF';
    const secColor = isGold ? '#FDE047' : '#E0F2FE';
    const op = Math.min(1.0, (0.72 + rand() * 0.28) * opacityScale).toFixed(2);

    // Razor-sharp concave slender optical light rays (tight waist 0.045 * size)
    const waist = size * 0.045;
    const secSize = size * 0.42;
    const coreR = Math.max(1.8, size * 0.14);

    items += `<g opacity="${op}" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${rotDeg})">
      <circle cx="0" cy="0" r="${(size * 1.35).toFixed(1)}" fill="url(#${auraId})"/>
      <path d="M 0,${(-size).toFixed(1)} Q ${waist.toFixed(1)},${(-waist).toFixed(1)} ${size.toFixed(1)},0 Q ${waist.toFixed(1)},${waist.toFixed(1)} 0,${size.toFixed(1)} Q ${(-waist).toFixed(1)},${waist.toFixed(1)} ${(-size).toFixed(1)},0 Q ${(-waist).toFixed(1)},${(-waist).toFixed(1)} 0,${(-size).toFixed(1)} Z" fill="${fillColor}"/>
      <path transform="rotate(45)" d="M 0,${(-secSize).toFixed(1)} Q ${(waist * 0.5).toFixed(1)},${(-waist * 0.5).toFixed(1)} ${secSize.toFixed(1)},0 Q ${(waist * 0.5).toFixed(1)},${(waist * 0.5).toFixed(1)} 0,${secSize.toFixed(1)} Q ${(-waist * 0.5).toFixed(1)},${(waist * 0.5).toFixed(1)} ${(-secSize).toFixed(1)},0 Q ${(-waist * 0.5).toFixed(1)},${(-waist * 0.5).toFixed(1)} 0,${(-secSize).toFixed(1)} Z" fill="${secColor}" opacity="0.78"/>
      <circle cx="0" cy="0" r="${coreR.toFixed(1)}" fill="#FFFFFF"/>
    </g>`;
  }

  for (let i = 0; i < dustCount; i++) {
    const cx = (padX + rand() * targetW).toFixed(1);
    const cy = (padY + rand() * targetH).toFixed(1);
    const r = ((1.8 + rand() * 3.0) * refScale).toFixed(1);
    const op = Math.min(0.95, (0.48 + rand() * 0.48) * opacityScale).toFixed(2);
    items += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#starAuraGold)" opacity="${op}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">
    <defs>
      <radialGradient id="starAuraGold">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
        <stop offset="22%" stop-color="#FEF9C3" stop-opacity="0.72"/>
        <stop offset="55%" stop-color="#FACC15" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#FACC15" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="starAuraWhite">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
        <stop offset="24%" stop-color="#E0F2FE" stop-opacity="0.68"/>
        <stop offset="58%" stop-color="#93C5FD" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${items}
  </svg>`;

  return { svg, padX, padY };
}

function buildSeamlessSnowSvg(
  targetW: number,
  targetH: number,
  ratio: number,
  layerVariant: 'near' | 'far'
): { svg: string; padX: number } {
  const padX = 72;
  const svgW = targetW + padX * 2;
  const svgH = targetH * 2;
  const rand = mulberry32(layerVariant === 'far' ? 314159 : 271828);

  const count =
    layerVariant === 'far'
      ? Math.round(22 + 50 * ratio)
      : Math.round(10 + 24 * ratio);
  const opacityScale = 0.45 + 0.55 * ratio;
  const refScale = Math.max(0.6, targetW / 1080);

  let items = '';
  for (let i = 0; i < count; i++) {
    const cx = (padX * 0.4 + rand() * (targetW + padX * 1.2)).toFixed(1);
    const cy = (rand() * targetH).toFixed(1);
    const r =
      layerVariant === 'far'
        ? ((2.5 + rand() * 3.5) * refScale).toFixed(1)
        : ((6.0 + rand() * 9.0) * refScale).toFixed(1);
    const op = Math.min(0.95, (layerVariant === 'far' ? 0.5 + rand() * 0.4 : 0.3 + rand() * 0.45) * opacityScale).toFixed(2);
    items += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#snowSoft)" opacity="${op}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">
    <defs>
      <radialGradient id="snowSoft">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
        <stop offset="45%" stop-color="#F8FAFC" stop-opacity="0.72"/>
        <stop offset="100%" stop-color="#E2E8F0" stop-opacity="0"/>
      </radialGradient>
      <g id="snowTile">${items}</g>
    </defs>
    <use href="#snowTile" y="0"/>
    <use href="#snowTile" y="${targetH}"/>
  </svg>`;

  return { svg, padX };
}

function buildSeamlessBokehSvg(
  targetW: number,
  targetH: number,
  ratio: number
): { svg: string; padX: number } {
  const padX = 96;
  const svgW = targetW + padX * 2;
  const svgH = targetH * 2;
  const rand = mulberry32(554433);
  const count = Math.round(7 + 16 * ratio);
  const opacityScale = 0.35 + 0.65 * ratio;
  const refScale = Math.max(0.6, targetW / 1080);

  let items = '';
  const palette = ['bokehGold', 'bokehRose', 'bokehAmber', 'bokehViolet'];
  for (let i = 0; i < count; i++) {
    const cx = (padX * 0.3 + rand() * (targetW + padX * 1.4)).toFixed(1);
    const cy = (rand() * targetH).toFixed(1);
    const r = ((28 + rand() * 52) * refScale).toFixed(1);
    const grad = palette[i % palette.length];
    const op = Math.min(0.42, (0.14 + rand() * 0.22) * opacityScale).toFixed(2);
    items += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${grad})" opacity="${op}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">
    <defs>
      <radialGradient id="bokehGold">
        <stop offset="0%" stop-color="#FEF08A" stop-opacity="0.45"/>
        <stop offset="72%" stop-color="#FACC15" stop-opacity="0.65"/>
        <stop offset="88%" stop-color="#FDE047" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#FACC15" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="bokehRose">
        <stop offset="0%" stop-color="#FBCFE8" stop-opacity="0.4"/>
        <stop offset="72%" stop-color="#F472B6" stop-opacity="0.55"/>
        <stop offset="88%" stop-color="#EC4899" stop-opacity="0.72"/>
        <stop offset="100%" stop-color="#EC4899" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="bokehAmber">
        <stop offset="0%" stop-color="#FED7AA" stop-opacity="0.42"/>
        <stop offset="72%" stop-color="#FB923C" stop-opacity="0.58"/>
        <stop offset="88%" stop-color="#F97316" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#F97316" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="bokehViolet">
        <stop offset="0%" stop-color="#DDD6FE" stop-opacity="0.38"/>
        <stop offset="72%" stop-color="#A78BFA" stop-opacity="0.52"/>
        <stop offset="88%" stop-color="#8B5CF6" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0"/>
      </radialGradient>
      <g id="bokehTile">${items}</g>
    </defs>
    <use href="#bokehTile" y="0"/>
    <use href="#bokehTile" y="${targetH}"/>
  </svg>`;

  return { svg, padX };
}

function buildSeamlessEmbersSvg(
  targetW: number,
  targetH: number,
  ratio: number,
  layerVariant: 'fast' | 'glow'
): { svg: string; padX: number } {
  const padX = 72;
  const svgW = targetW + padX * 2;
  const svgH = targetH * 2;
  const rand = mulberry32(layerVariant === 'fast' ? 667788 : 778899);
  const count =
    layerVariant === 'fast'
      ? Math.round(16 + 40 * ratio)
      : Math.round(10 + 22 * ratio);
  const opacityScale = 0.45 + 0.55 * ratio;
  const refScale = Math.max(0.6, targetW / 1080);

  let items = '';
  for (let i = 0; i < count; i++) {
    const cx = Number((padX * 0.4 + rand() * (targetW + padX * 1.2)).toFixed(1));
    const cy = Number((rand() * targetH).toFixed(1));
    const rx = ((2.2 + rand() * 3.5) * refScale).toFixed(1);
    const ry = (Number(rx) * (2.2 + rand() * 2.5)).toFixed(1);
    const angle = Math.round((rand() - 0.5) * 28);
    const op = Math.min(0.95, (0.45 + rand() * 0.5) * opacityScale).toFixed(2);
    const grad = rand() > 0.4 ? 'emberGold' : 'emberRed';
    items += `<g transform="translate(${cx},${cy}) rotate(${angle})" opacity="${op}">
      <ellipse cx="0" cy="0" rx="${(Number(rx) * 2.5).toFixed(1)}" ry="${(Number(ry) * 1.6).toFixed(1)}" fill="url(#${grad})"/>
      <ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="#FEF08A"/>
    </g>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">
    <defs>
      <radialGradient id="emberGold">
        <stop offset="0%" stop-color="#FEF08A" stop-opacity="0.95"/>
        <stop offset="40%" stop-color="#F97316" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="#EA580C" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="emberRed">
        <stop offset="0%" stop-color="#FED7AA" stop-opacity="0.9"/>
        <stop offset="45%" stop-color="#EF4444" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#DC2626" stop-opacity="0"/>
      </radialGradient>
      <g id="emberTile">${items}</g>
    </defs>
    <use href="#emberTile" y="0"/>
    <use href="#emberTile" y="${targetH}"/>
  </svg>`;

  return { svg, padX };
}

function buildVignetteSvg(targetW: number, targetH: number, ratio: number): string {
  const edgeAlpha = (0.28 + 0.58 * ratio).toFixed(2);
  const midAlpha = (0.1 + 0.22 * ratio).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${targetW}" height="${targetH}">
    <defs>
      <radialGradient id="vig" cx="50%" cy="50%" r="72%">
        <stop offset="48%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="78%" stop-color="#05070B" stop-opacity="${midAlpha}"/>
        <stop offset="100%" stop-color="#020408" stop-opacity="${edgeAlpha}"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="${targetW}" height="${targetH}" fill="url(#vig)"/>
  </svg>`;
}

/**
 * Renders crisp, anti-aliased radial-glow PNG overlay layers via Sharp SVG, cached cleanly per size/intensity.
 */
export async function generateSeamlessOverlayAssets(options: {
  targetW: number;
  targetH: number;
  overlays: VideoOverlayType[];
  overlayIntensity: number;
}): Promise<OverlayAssetLayer[]> {
  const { targetW, targetH, overlays, overlayIntensity } = options;
  if (!Array.isArray(overlays) || overlays.length === 0) return [];

  // Quantize intensity to multiples of 5 for fast filesystem cache reuse
  const qIntensity = Math.max(10, Math.min(100, Math.round(overlayIntensity / 5) * 5));
  const ratio = qIntensity / 100;
  const layers: OverlayAssetLayer[] = [];

  for (const ov of overlays) {
    if (ov === 'floating_dust' || ov === 'particles') {
      const fine = buildSeamlessDustSvg(targetW, targetH, ratio, 'fine');
      const finePath = await renderSvgToCachedPng(`dust_fine_${targetW}x${targetH}_${qIntensity}`, fine.svg);
      layers.push({
        filePath: finePath,
        kind: 'scroll_up',
        padX: fine.padX,
        padY: 0,
        speedY: 42,
        swayAmpX: 28,
        swayFreq: 0.72,
      });

      const bokeh = buildSeamlessDustSvg(targetW, targetH, ratio, 'bokeh');
      const bokehPath = await renderSvgToCachedPng(`dust_bokeh_${targetW}x${targetH}_${qIntensity}`, bokeh.svg);
      layers.push({
        filePath: bokehPath,
        kind: 'scroll_up',
        padX: bokeh.padX,
        padY: 0,
        speedY: 68,
        swayAmpX: 38,
        swayFreq: 0.52,
      });
    } else if (ov === 'glitter_sparkle') {
      // Three asynchronous staggered twinkle layers so stars organically breathe in & out cleanly
      const timings = [
        { period: 1.6, offset: 0.0, swayAmpX: 16, swayFreq: 0.6 },
        { period: 2.2, offset: 0.7, swayAmpX: 14, swayFreq: 0.5 },
        { period: 2.8, offset: 1.4, swayAmpX: 12, swayFreq: 0.42 },
      ];
      for (let idx = 0; idx < timings.length; idx++) {
        const star = buildTwinkleStarsSvg(targetW, targetH, ratio, idx);
        const starPath = await renderSvgToCachedPng(`twinkle_${idx}_${targetW}x${targetH}_${qIntensity}`, star.svg);
        layers.push({
          filePath: starPath,
          kind: 'twinkle_fade',
          padX: star.padX,
          padY: star.padY,
          swayAmpX: timings[idx].swayAmpX,
          swayFreq: timings[idx].swayFreq,
          fadePeriodSec: timings[idx].period,
          fadeOffsetSec: timings[idx].offset,
        });
      }
    } else if (ov === 'particle_snow') {
      const far = buildSeamlessSnowSvg(targetW, targetH, ratio, 'far');
      const farPath = await renderSvgToCachedPng(`snow_far_${targetW}x${targetH}_${qIntensity}`, far.svg);
      layers.push({
        filePath: farPath,
        kind: 'scroll_down',
        padX: far.padX,
        padY: 0,
        speedY: 105,
        swayAmpX: 30,
        swayFreq: 0.9,
      });

      const near = buildSeamlessSnowSvg(targetW, targetH, ratio, 'near');
      const nearPath = await renderSvgToCachedPng(`snow_near_${targetW}x${targetH}_${qIntensity}`, near.svg);
      layers.push({
        filePath: nearPath,
        kind: 'scroll_down',
        padX: near.padX,
        padY: 0,
        speedY: 175,
        swayAmpX: 48,
        swayFreq: 0.65,
      });
    } else if (ov === 'bokeh_lights') {
      const bk = buildSeamlessBokehSvg(targetW, targetH, ratio);
      const bkPath = await renderSvgToCachedPng(`bokeh_${targetW}x${targetH}_${qIntensity}`, bk.svg);
      layers.push({
        filePath: bkPath,
        kind: 'scroll_up',
        padX: bk.padX,
        padY: 0,
        speedY: 54,
        swayAmpX: 48,
        swayFreq: 0.45,
      });
    } else if (ov === 'fire_embers') {
      const fast = buildSeamlessEmbersSvg(targetW, targetH, ratio, 'fast');
      const fastPath = await renderSvgToCachedPng(`embers_fast_${targetW}x${targetH}_${qIntensity}`, fast.svg);
      layers.push({
        filePath: fastPath,
        kind: 'scroll_up',
        padX: fast.padX,
        padY: 0,
        speedY: 260,
        swayAmpX: 44,
        swayFreq: 1.8,
      });

      const glow = buildSeamlessEmbersSvg(targetW, targetH, ratio, 'glow');
      const glowPath = await renderSvgToCachedPng(`embers_glow_${targetW}x${targetH}_${qIntensity}`, glow.svg);
      layers.push({
        filePath: glowPath,
        kind: 'scroll_up',
        padX: glow.padX,
        padY: 0,
        speedY: 170,
        swayAmpX: 36,
        swayFreq: 1.3,
      });
    } else if (ov === 'vignette') {
      const vigSvg = buildVignetteSvg(targetW, targetH, ratio);
      const vigPath = await renderSvgToCachedPng(`vignette_${targetW}x${targetH}_${qIntensity}`, vigSvg);
      layers.push({
        filePath: vigPath,
        kind: 'static_vignette',
        padX: 0,
        padY: 0,
      });
    }
  }

  return layers;
}
