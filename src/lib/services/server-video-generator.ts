import fs from 'fs';
import path from 'path';
import https from 'https';
import zlib from 'zlib';
import sharp from 'sharp';
import { spawn } from 'child_process';
import { VideoMotionEffect, VideoOverlayType } from '@/types';
import { saveMediaToDb, getMediaFromDb } from '@/lib/db/mysql';
import { generateSeamlessOverlayAssets, OverlayAssetLayer } from './video-overlay-renderer';

let cachedFfmpegPath: string | null = null;

function runFfmpegSpawn(bin: string, args: string[], timeoutMs = 120000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`FFmpeg timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      if (stderr.length > 16000) {
        stderr = stderr.slice(-16000);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        const rawLines = stderr.split('\n').map((l) => l.trim()).filter(Boolean);
        const errorLines = rawLines.filter((l) => /error|failed|invalid|no such|cannot|fault|aborted/i.test(l));
        const meaningful = errorLines.length > 0 ? errorLines.slice(-3).join(' | ') : rawLines.slice(-2).join(' | ');
        reject(new Error(`FFmpeg error (code ${code}): ${meaningful || 'Unknown conversion error'}`));
      }
    });
  });
}

function pipeDownload(
  stream: import('http').IncomingMessage,
  dest: string,
  resolve: (val: boolean) => void
) {
  try {
    const gunzip = zlib.createGunzip();
    const fileStream = fs.createWriteStream(dest);

    stream.pipe(gunzip).pipe(fileStream);

    fileStream.on('finish', () => {
      fileStream.close(() => {
        try {
          fs.chmodSync(dest, 0o755);
        } catch {}
        console.log(`[server-video-generator] Downloaded & prepared ffmpeg binary at: ${dest}`);
        resolve(true);
      });
    });

    gunzip.on('error', (err) => {
      console.warn('[server-video-generator] Gunzip error:', err.message);
      resolve(false);
    });

    fileStream.on('error', (err) => {
      console.warn('[server-video-generator] FileStream error:', err.message);
      resolve(false);
    });
  } catch (err) {
    console.warn('[server-video-generator] Pipe error:', err);
    resolve(false);
  }
}

async function downloadFfmpegTo(dest: string): Promise<boolean> {
  const platform = process.platform;
  const arch = process.arch;
  const tag = 'b6.1.1';
  const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/${tag}/ffmpeg-${platform}-${arch}.gz`;

  return new Promise((resolve) => {
    try {
      const dir = path.dirname(dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const req = https.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          https.get(res.headers.location, (redirectRes) => {
            if (redirectRes.statusCode !== 200) {
              console.warn(`[server-video-generator] Redirect failed: ${redirectRes.statusCode}`);
              return resolve(false);
            }
            pipeDownload(redirectRes, dest, resolve);
          }).on('error', (err) => {
            console.warn('[server-video-generator] Redirect error:', err.message);
            resolve(false);
          });
          return;
        }

        if (res.statusCode !== 200) {
          console.warn(`[server-video-generator] Download failed with status: ${res.statusCode}`);
          return resolve(false);
        }

        pipeDownload(res, dest, resolve);
      });

      req.on('error', (err) => {
        console.warn('[server-video-generator] Download request error:', err.message);
        resolve(false);
      });
      req.setTimeout(30000, () => {
        req.destroy();
        resolve(false);
      });
    } catch (e) {
      console.warn('[server-video-generator] downloadFfmpegTo error:', e);
      resolve(false);
    }
  });
}

// Resolve ffmpeg path safely (supports bundled bin, public/bin, ffmpeg-static, system PATH, and on-demand fallback)
async function getFfmpegPath(): Promise<string> {
  if (cachedFfmpegPath && fs.existsSync(cachedFfmpegPath)) {
    return cachedFfmpegPath;
  }

  const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

  // 1. Explicit environment variable
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    cachedFfmpegPath = process.env.FFMPEG_PATH;
    return cachedFfmpegPath;
  }

  // 2. Candidate paths in filesystem
  const candidatePaths = [
    path.join(process.cwd(), 'bin', binaryName),
    path.join(process.cwd(), 'public', 'bin', binaryName),
    path.join(process.cwd(), '..', 'public_html', 'bin', binaryName),
    path.join(process.cwd(), 'public', 'uploads', 'bin', binaryName),
    path.join('/tmp', binaryName),
    path.join(__dirname, '..', '..', '..', 'bin', binaryName),
    path.join(__dirname, '..', '..', '..', 'public', 'bin', binaryName),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).size > 1000000) {
        try { fs.chmodSync(p, 0o755); } catch {}
        cachedFfmpegPath = p;
        console.log(`[server-video-generator] Using ffmpeg from: ${p}`);
        return p;
      }
    } catch {}
  }

  // 3. ffmpeg-static require
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic) && fs.statSync(ffmpegStatic).size > 1000000) {
      try { fs.chmodSync(ffmpegStatic, 0o755); } catch {}
      cachedFfmpegPath = ffmpegStatic;
      console.log(`[server-video-generator] Using ffmpeg from ffmpeg-static: ${ffmpegStatic}`);
      return ffmpegStatic;
    }
  } catch (e) {
    console.warn('[server-video-generator] ffmpeg-static require failed:', e);
  }

  // 4. Common Linux / Unix system binaries
  const commonLinuxPaths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/bin/ffmpeg'];
  for (const p of commonLinuxPaths) {
    if (fs.existsSync(p)) {
      cachedFfmpegPath = p;
      return p;
    }
  }

  // 5. Auto-download on demand to /tmp or public/uploads/bin
  console.log('[server-video-generator] No local ffmpeg found. Attempting dynamic download fallback...');
  const tmpDest = path.join('/tmp', binaryName);
  const downloadedToTmp = await downloadFfmpegTo(tmpDest);
  if (downloadedToTmp && fs.existsSync(tmpDest)) {
    cachedFfmpegPath = tmpDest;
    return tmpDest;
  }

  const appBinDest = path.join(process.cwd(), 'public', 'uploads', 'bin', binaryName);
  const downloadedToApp = await downloadFfmpegTo(appBinDest);
  if (downloadedToApp && fs.existsSync(appBinDest)) {
    cachedFfmpegPath = appBinDest;
    return appBinDest;
  }

  return 'ffmpeg';
}

export interface GenerateVideoReelOptions {
  imageBase64?: string;
  imageFilePath?: string;
  imageUrl?: string;
  // Separate Layered Composition ("Stable Frame + Animated Featured Image")
  featuredImageBase64?: string;
  featuredImageUrl?: string;
  frameOverlayBase64?: string;
  layerMode?: 'overlay' | 'background';
  backgroundColor?: string;
  featuredImageBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    borderRadius?: number;
  };
  canvasWidth?: number; // custom canvas width (default 1080)
  canvasHeight?: number; // custom canvas height (default 1920)
  durationSeconds?: number; // total custom duration in seconds (5 to 90)
  effect?: VideoMotionEffect; // single effect (legacy fallback)
  effects?: VideoMotionEffect[]; // Multiple selected motion animation styles!
  effectDurationSeconds?: number; // custom duration for animations to run
  motionIntensity?: number; // 5 to 100 (%) - default 20% (Subtle & Readable)
  overlays?: VideoOverlayType[]; // Multiple overlays can be selected!
  overlayIntensity?: number; // 10 to 100 (%) - default 50%
  musicUrl?: string; // e.g. "/uploads/audio/track.mp3" or remote URL
  musicVolume?: number; // 0 to 100 (default 100)
  outputFilename?: string;
}

export interface VideoReelResult {
  success: boolean;
  videoUrl: string; // Public URL, e.g. "/uploads/videos/reel_123.mp4"
  filePath: string;
  duration: number;
  sizeBytes: number;
  effect: VideoMotionEffect;
  effects?: VideoMotionEffect[];
  error?: string;
}

/**
 * Downloads or resolves remote/local media to a temporary file path
 */
async function resolveMediaToLocal(
  mediaInput?: string,
  tempPrefix = 'media',
  ext = '.png',
  createdTmpFiles?: string[]
): Promise<string | null> {
  if (!mediaInput || typeof mediaInput !== 'string') return null;
  const trimmed = mediaInput.trim();
  if (!trimmed) return null;

  const tempDir = path.join(process.cwd(), 'public', 'uploads', 'tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Handle Base64 Data URI
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    const buffer = Buffer.from(match[2], 'base64');
    const tempFile = path.join(tempDir, `${tempPrefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`);
    fs.writeFileSync(tempFile, buffer);
    if (createdTmpFiles) createdTmpFiles.push(tempFile);
    return tempFile;
  }

  // Check local /uploads/ path even inside full http(s) URLs first
  if (trimmed.includes('/uploads/')) {
    try {
      const uploadRel = trimmed.substring(trimmed.indexOf('/uploads/')).split('?')[0].replace(/^\/+/, '');
      const diskFile = path.join(process.cwd(), 'public', uploadRel);
      if (fs.existsSync(diskFile)) {
        return diskFile;
      }
      const filename = path.basename(uploadRel);
      const dbMedia = (await getMediaFromDb(uploadRel)) || (await getMediaFromDb(filename));
      if (dbMedia && dbMedia.data) {
        const tempFile = path.join(tempDir, `${tempPrefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`);
        fs.writeFileSync(tempFile, dbMedia.data);
        if (createdTmpFiles) createdTmpFiles.push(tempFile);
        return tempFile;
      }
    } catch {}
  }

  // Handle existing local file path (e.g. /uploads/...)
  const cleanPath = trimmed.replace(/^\/+/, '').split('?')[0];
  const localFile = path.join(process.cwd(), 'public', cleanPath);
  if (fs.existsSync(localFile)) {
    return localFile;
  }

  // Handle MySQL database media storage fallback
  try {
    const filename = path.basename(cleanPath);
    const dbMedia = (await getMediaFromDb(cleanPath)) || (await getMediaFromDb(filename));
    if (dbMedia && dbMedia.data) {
      const tempFile = path.join(tempDir, `${tempPrefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`);
      fs.writeFileSync(tempFile, dbMedia.data);
      if (createdTmpFiles) createdTmpFiles.push(tempFile);
      return tempFile;
    }
  } catch (dbErr) {
    console.warn('[server-video-generator] DB media fallback error:', dbErr);
  }

  // Handle remote HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const res = await fetch(trimmed, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
      });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const tempFile = path.join(tempDir, `${tempPrefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`);
      fs.writeFileSync(tempFile, buf);
      if (createdTmpFiles) createdTmpFiles.push(tempFile);
      return tempFile;
    } catch (err) {
      console.error(`[server-video-generator] Error fetching ${trimmed}:`, err);
      return null;
    }
  }

  return null;
}

/**
 * Creates & caches a grayscale rounded-rectangle mask PNG for clipping animated photo corners cleanly
 */
async function ensureRoundedMaskPng(w: number, h: number, radius: number): Promise<string | null> {
  if (radius <= 0) return null;
  const r = Math.min(Math.round(radius), Math.floor(Math.min(w, h) / 2));
  if (r <= 0) return null;

  const maskDir = path.join(process.cwd(), 'public', 'uploads', 'tmp', 'masks');
  if (!fs.existsSync(maskDir)) {
    fs.mkdirSync(maskDir, { recursive: true });
  }
  const maskPath = path.join(maskDir, `mask_${w}x${h}_r${r}.png`);
  if (fs.existsSync(maskPath) && fs.statSync(maskPath).size > 100) {
    return maskPath;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="0" y="0" width="${w}" height="${h}" fill="#000000"/>
    <rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#FFFFFF"/>
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 2 }).toBuffer();
  fs.writeFileSync(maskPath, buf);
  return maskPath;
}

function normalizeFfmpegHexColor(color?: string): string {
  if (!color || typeof color !== 'string') return '0x0B0F19';
  const trimmed = color.trim();
  if (/^#([0-9A-Fa-f]{6})$/.test(trimmed)) {
    return `0x${trimmed.slice(1)}`;
  }
  if (/^#([0-9A-Fa-f]{3})$/.test(trimmed)) {
    const h = trimmed.slice(1);
    return `0x${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return '0x0B0F19';
}

/**
 * Builds an FFmpeg filter chain for [inIdx:v] -> [outLabel] animating ONLY the photo stream
 * using high-res pre-scaling + single-pass zoompan so Zoom In/Out, Pan Left/Right, Pulse Boom,
 * Float, Sway, Shake, and Shimmer render smoothly at 30fps without black-border clipping.
 */
function buildAnimatedPhotoFilterChain(params: {
  inIdx: number;
  outLabel: string;
  outW: number;
  outH: number;
  fps: number;
  duration: number;
  animDuration: number;
  activeEffects: VideoMotionEffect[];
  intensityRatio: number;
  isStaticOnly: boolean;
}): string {
  const { inIdx, outLabel, outW, outH, fps, duration, animDuration, activeEffects, intensityRatio, isStaticOnly } = params;
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const animFrames = Math.max(1, Math.round(animDuration * fps));

  const hasSubtleFloat = activeEffects.includes('subtle_float');
  const hasMicroJitter = activeEffects.includes('micro_jitter');
  const hasSmoothSway = activeEffects.includes('smooth_sway');
  const hasVerticalDrift = activeEffects.includes('vertical_drift');
  const hasPulseShake = activeEffects.includes('pulse_shake');
  const hasShake = activeEffects.includes('shake');
  const hasJitter = activeEffects.includes('breaking_jitter');
  const hasPanLeft = activeEffects.includes('pan_left');
  const hasPanRight = activeEffects.includes('pan_right');
  const hasZoomIn = activeEffects.includes('zoom_in');
  const hasZoomOut = activeEffects.includes('zoom_out');
  const hasPulse = activeEffects.includes('pulse') || activeEffects.includes('pulse_boom') || hasPulseShake;
  const hasGlitter = activeEffects.includes('glitter');

  const needsSpatialZoompan =
    !isStaticOnly &&
    (hasSubtleFloat ||
      hasMicroJitter ||
      hasSmoothSway ||
      hasVerticalDrift ||
      hasPulseShake ||
      hasShake ||
      hasJitter ||
      hasPanLeft ||
      hasPanRight ||
      hasZoomIn ||
      hasZoomOut ||
      hasPulse);

  const chain: string[] = [];

  if (!needsSpatialZoompan) {
    // Still photo or brightness-only shimmer (when input is fed via -loop 1 -framerate 30 -t duration)
    chain.push(`scale=${outW}:${outH}:force_original_aspect_ratio=increase:flags=bicubic,crop=${outW}:${outH},setsar=1`);
  } else {
    // Pre-scale source to ~1.55x target size so zoompan interpolation stays crisp & fluid
    const workW = Math.min(2048, Math.max(outW + 64, Math.round((outW * 1.55) / 2) * 2));
    const workH = Math.min(2880, Math.max(outH + 64, Math.round((outH * 1.55) / 2) * 2));
    chain.push(`scale=${workW}:${workH}:force_original_aspect_ratio=increase:flags=bicubic,crop=${workW}:${workH},setsar=1`);

    const needsPanMargin =
      hasPanLeft ||
      hasPanRight ||
      hasSubtleFloat ||
      hasSmoothSway ||
      hasVerticalDrift ||
      hasMicroJitter ||
      hasShake ||
      hasJitter ||
      hasPulseShake;

    const baseZ = needsPanMargin ? 1.16 + 0.14 * intensityRatio : 1.0;
    const zoomDelta = 0.14 + 0.28 * intensityRatio;

    let zBaseExpr = baseZ.toFixed(4);
    if (hasZoomIn && !hasZoomOut) {
      zBaseExpr = `${baseZ.toFixed(4)}+${zoomDelta.toFixed(4)}*min(1,on/${animFrames})`;
    } else if (hasZoomOut) {
      zBaseExpr = `${(baseZ + zoomDelta).toFixed(4)}-${zoomDelta.toFixed(4)}*min(1,on/${animFrames})`;
    }

    let zExpr = zBaseExpr;
    if (hasPulse) {
      // Energetic beat-pop boom wave (~1.18s cadence, sharp kick & smooth settle)
      const boomAmp = (0.06 + 0.14 * intensityRatio).toFixed(4);
      zExpr = `(${zBaseExpr})+${boomAmp}*pow(max(0,0.5-0.5*cos(2*PI*(on/${fps})*0.85)),3)*if(lt(on,${animFrames}),1,0)`;
    }

    const halfMX = '((iw-iw/zoom)/2)';
    const halfMY = '((ih-ih/zoom)/2)';
    const gate = `if(lt(on,${animFrames}),1,0)`;

    const xOffs: string[] = [];
    const yOffs: string[] = [];

    if (hasPanRight) {
      xOffs.push(`${halfMX}*0.92*(2*min(1,on/${animFrames})-1)`);
    } else if (hasPanLeft) {
      xOffs.push(`${halfMX}*0.92*(1-2*min(1,on/${animFrames}))`);
    }

    if (hasSmoothSway) {
      xOffs.push(`${halfMX}*0.78*sin(2*PI*on/(${fps}*4.0))*${gate}`);
    }

    if (hasSubtleFloat) {
      xOffs.push(`${halfMX}*0.50*sin(2*PI*on/(${fps}*3.8))*${gate}`);
      yOffs.push(`${halfMY}*0.50*cos(2*PI*on/(${fps}*3.4))*${gate}`);
    }

    if (hasVerticalDrift) {
      yOffs.push(`${halfMY}*0.78*sin(2*PI*on/(${fps}*4.2))*${gate}`);
    }

    if (hasMicroJitter) {
      const mj = (0.20 + 0.25 * intensityRatio).toFixed(3);
      xOffs.push(`${halfMX}*${mj}*(0.65*sin(on*0.55)+0.35*sin(on*1.15))*${gate}`);
      yOffs.push(`${halfMY}*${mj}*(0.65*cos(on*0.48)+0.35*cos(on*1.05))*${gate}`);
    }

    if (hasShake) {
      const sh = (0.34 + 0.42 * intensityRatio).toFixed(3);
      const bGate = `if(lt(mod(on,45),18)*lt(on,${animFrames}),1,0.06)`;
      xOffs.push(`${halfMX}*${sh}*sin(on*0.85)*${bGate}`);
      yOffs.push(`${halfMY}*${sh}*cos(on*0.95)*${bGate}`);
    }

    if (hasJitter) {
      const bj = (0.32 + 0.40 * intensityRatio).toFixed(3);
      xOffs.push(`${halfMX}*${bj}*sin(on*0.95)*${gate}`);
      yOffs.push(`${halfMY}*${bj}*cos(on*1.10)*${gate}`);
    }

    if (hasPulseShake) {
      const ps = (0.24 + 0.30 * intensityRatio).toFixed(3);
      xOffs.push(`${halfMX}*${ps}*sin(on*1.15)*pow(max(0,0.5-0.5*cos(2*PI*(on/${fps})*0.85)),2)*${gate}`);
      yOffs.push(`${halfMY}*${ps}*cos(on*1.25)*pow(max(0,0.5-0.5*cos(2*PI*(on/${fps})*0.85)),2)*${gate}`);
    }

    const xRaw = xOffs.length > 0 ? `${halfMX}+${xOffs.join('+')}` : halfMX;
    const yRaw = yOffs.length > 0 ? `${halfMY}+${yOffs.join('+')}` : halfMY;
    const xExpr = `max(0,min(iw-iw/zoom,${xRaw}))`;
    const yExpr = `max(0,min(ih-ih/zoom,${yRaw}))`;

    chain.push(
      `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${totalFrames}:s=${outW}x${outH}:fps=${fps},setsar=1,setpts=PTS-STARTPTS`
    );
  }

  if (hasGlitter) {
    chain.push(
      `eq=brightness='${(0.06 * intensityRatio).toFixed(3)}*sin(2*PI*t*1.35)':saturation='1.0+${(0.22 * intensityRatio).toFixed(3)}*(0.5+0.5*cos(2*PI*t*1.35))':enable='between(t,0,${animDuration})'`
    );
  }

  if (hasJitter) {
    chain.push(
      `eq=brightness='${(0.065 * intensityRatio).toFixed(3)}*if(lt(mod(n,40),5)*lt(n,${animFrames}),1,0)'`
    );
  }

  chain.push(`fps=${fps},trim=duration=${duration},setpts=PTS-STARTPTS`);
  return `[${inIdx}:v]${chain.join(',')}[${outLabel}]`;
}

/**
 * Generates an ultra high-quality 9:16 vertical MP4 video reel (1080x1920)
 * from a static news image with motion effects and trimmed background music.
 */
export async function generateServerVideoReel(options: GenerateVideoReelOptions): Promise<VideoReelResult> {
  const {
    imageBase64,
    imageFilePath,
    imageUrl,
    featuredImageBase64,
    featuredImageUrl,
    frameOverlayBase64,
    layerMode = 'overlay',
    backgroundColor = '#0B0F19',
    featuredImageBox,
    canvasWidth = 1080,
    canvasHeight = 1920,
    durationSeconds = 15,
    effect = 'subtle_float',
    effects,
    effectDurationSeconds,
    motionIntensity = 20,
    overlays = [],
    overlayIntensity = 50,
    musicUrl,
    musicVolume = 100,
    outputFilename,
  } = options;

  // Custom Reel Duration clamped between 5s and 90s
  const duration = Math.min(Math.max(Number(durationSeconds) || 15, 5), 90);

  // Custom Animation Duration clamped between 2s and total reel duration
  const animDuration = Math.min(
    duration,
    Math.max(2, Number(effectDurationSeconds) || duration)
  );

  // Target canvas dimensions (must be even for libx264)
  const rawW = Number(canvasWidth) || 1080;
  const rawH = Number(canvasHeight) || 1920;
  const targetW = Math.max(320, Math.round(rawW / 2) * 2);
  const targetH = Math.max(320, Math.round(rawH / 2) * 2);

  // Motion Intensity: 5 to 100 (%) - default 20%
  const mIntensity = Math.max(5, Math.min(100, Number(motionIntensity) || 20));
  const intensityRatio = mIntensity / 100;

  // Overlay Intensity: 10 to 100 (%) - default 50%
  const oIntensity = Math.max(10, Math.min(100, Number(overlayIntensity) || 50));
  const ovIntensityRatio = oIntensity / 100;

  // Determine active effects list (supports multi-selection!)
  let activeEffects: VideoMotionEffect[] = [];
  if (Array.isArray(effects) && effects.length > 0) {
    activeEffects = effects.filter((e) => e !== 'none');
  } else if (effect && effect !== 'none') {
    activeEffects = [effect];
  }
  if (activeEffects.length === 0) {
    activeEffects = ['none'];
  }

  const ffmpegBin = await getFfmpegPath();

  // Ensure output directories exist
  const videosDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  const createdTmpFiles: string[] = [];

  // 1. Resolve Inputs (Layered Mode vs Legacy Flat Mode)
  const inputFeaturedPhoto =
    (await resolveMediaToLocal(featuredImageBase64, 'feat_photo', '.png', createdTmpFiles)) ||
    (await resolveMediaToLocal(featuredImageUrl, 'feat_photo', '.png', createdTmpFiles));
  const inputFrameLayer = await resolveMediaToLocal(frameOverlayBase64, 'frame_layer', '.png', createdTmpFiles);

  const inputFlatFallback =
    (await resolveMediaToLocal(imageBase64, 'frame', '.png', createdTmpFiles)) ||
    (await resolveMediaToLocal(imageUrl, 'frame', '.png', createdTmpFiles)) ||
    (imageFilePath && fs.existsSync(imageFilePath) ? imageFilePath : null);

  const hasLayeredMode = Boolean(inputFeaturedPhoto && inputFrameLayer && featuredImageBox);
  const inputLegacyImage = inputFlatFallback || inputFeaturedPhoto || inputFrameLayer;

  if (!hasLayeredMode && !inputLegacyImage) {
    throw new Error('No valid input image provided for video reel generation.');
  }

  // 2. Resolve Input Music (if provided)
  const inputMusic = musicUrl ? await resolveMediaToLocal(musicUrl, 'audio', '.mp3', createdTmpFiles) : null;

  // 3. Prepare Output Path
  const cleanBaseName = outputFilename
    ? outputFilename.replace(/[^a-zA-Z0-9_-]/g, '_')
    : `reel_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const finalFilename = `${cleanBaseName}.mp4`;
  const finalFilePath = path.join(videosDir, finalFilename);
  const publicVideoUrl = `/uploads/videos/${finalFilename}`;

  const fps = 30;
  const cleanOverlays = Array.isArray(overlays) ? overlays : [];

  // 4. Generate Rounded Mask (if borderRadius > 0 in layered mode)
  let boxX = 0;
  let boxY = 0;
  let boxW = targetW;
  let boxH = targetH;
  let maskFilePath: string | null = null;

  if (hasLayeredMode && featuredImageBox) {
    boxX = Math.max(0, Math.min(Math.round(featuredImageBox.x || 0), targetW - 20));
    boxY = Math.max(0, Math.min(Math.round(featuredImageBox.y || 0), targetH - 20));
    const maxAvailW = targetW - boxX;
    const maxAvailH = targetH - boxY;
    boxW = Math.max(20, Math.min(Math.round((featuredImageBox.width || targetW) / 2) * 2, Math.floor(maxAvailW / 2) * 2));
    boxH = Math.max(20, Math.min(Math.round((featuredImageBox.height || targetH) / 2) * 2, Math.floor(maxAvailH / 2) * 2));

    if (featuredImageBox.borderRadius && featuredImageBox.borderRadius > 0) {
      try {
        maskFilePath = await ensureRoundedMaskPng(boxW, boxH, featuredImageBox.borderRadius);
      } catch (maskErr) {
        console.warn('[server-video-generator] Rounded mask notice:', maskErr);
      }
    }
  }

  // 5. Generate Gorgeous SVG Radial-Glow Transparent Overlay Layers via Sharp
  let overlayLayers: OverlayAssetLayer[] = [];
  try {
    overlayLayers = await generateSeamlessOverlayAssets({
      targetW,
      targetH,
      overlays: cleanOverlays,
      overlayIntensity: oIntensity,
    });
  } catch (ovErr) {
    console.warn('[server-video-generator] Overlay layer generation warning:', ovErr);
  }

  // Determine whether primary animated image uses zoompan (1-frame input) vs looped static
  const hasSpatialEffects = activeEffects.some((e) => e !== 'none' && e !== 'glitter');

  const args: string[] = [
    '-nostats',
    '-loglevel',
    'error',
    '-y',
  ];

  const filterGraphParts: string[] = [];
  let nextInputIdx = 0;

  if (hasLayeredMode && inputFeaturedPhoto && inputFrameLayer) {
    // LAYERED MODE: Frame & Text are 100% STABLE; ONLY Featured Image animates!
    const photoIdx = nextInputIdx++;
    if (hasSpatialEffects) {
      args.push('-i', inputFeaturedPhoto);
    } else {
      args.push('-loop', '1', '-framerate', String(fps), '-t', String(duration), '-i', inputFeaturedPhoto);
    }

    const frameIdx = nextInputIdx++;
    args.push('-loop', '1', '-framerate', String(fps), '-t', String(duration), '-i', inputFrameLayer);

    let maskIdx = -1;
    if (maskFilePath) {
      maskIdx = nextInputIdx++;
      args.push('-loop', '1', '-framerate', String(fps), '-t', String(duration), '-i', maskFilePath);
    }

    // Build animated photo stream [photo_anim] at boxW x boxH
    filterGraphParts.push(
      buildAnimatedPhotoFilterChain({
        inIdx: photoIdx,
        outLabel: 'photo_anim',
        outW: boxW,
        outH: boxH,
        fps,
        duration,
        animDuration,
        activeEffects,
        intensityRatio,
        isStaticOnly: !hasSpatialEffects,
      })
    );

    let readyPhotoLabel = 'photo_ready';
    if (maskIdx >= 0) {
      filterGraphParts.push(`[photo_anim]format=rgba[pa]`);
      filterGraphParts.push(`[${maskIdx}:v]format=gray,trim=duration=${duration},setpts=PTS-STARTPTS[pm]`);
      filterGraphParts.push(`[pa][pm]alphamerge[${readyPhotoLabel}]`);
    } else {
      filterGraphParts.push(`[photo_anim]format=rgba[${readyPhotoLabel}]`);
    }

    if (layerMode === 'background') {
      filterGraphParts.push(`[${frameIdx}:v]scale=${targetW}:${targetH}:flags=bicubic,format=rgba[frame_bg]`);
      filterGraphParts.push(`[frame_bg][${readyPhotoLabel}]overlay=x=${boxX}:y=${boxY}:shortest=1[base0]`);
    } else {
      const bgHex = normalizeFfmpegHexColor(backgroundColor);
      filterGraphParts.push(`color=c=${bgHex}:s=${targetW}x${targetH}:r=${fps}:d=${duration},format=rgba[bg_canvas]`);
      filterGraphParts.push(`[${frameIdx}:v]scale=${targetW}:${targetH}:flags=bicubic,format=rgba[frame_fg]`);
      filterGraphParts.push(`[bg_canvas][${readyPhotoLabel}]overlay=x=${boxX}:y=${boxY}:shortest=1[with_photo]`);
      filterGraphParts.push(`[with_photo][frame_fg]overlay=0:0:shortest=1[base0]`);
    }
  } else if (inputLegacyImage) {
    // LEGACY FLAT FALLBACK MODE (when no separate template frame + photo exist)
    const legacyIdx = nextInputIdx++;
    if (hasSpatialEffects) {
      args.push('-i', inputLegacyImage);
    } else {
      args.push('-loop', '1', '-framerate', String(fps), '-t', String(duration), '-i', inputLegacyImage);
    }

    filterGraphParts.push(
      buildAnimatedPhotoFilterChain({
        inIdx: legacyIdx,
        outLabel: 'base_raw',
        outW: targetW,
        outH: targetH,
        fps,
        duration,
        animDuration,
        activeEffects,
        intensityRatio,
        isStaticOnly: !hasSpatialEffects,
      })
    );
    filterGraphParts.push(`[base_raw]format=rgba[base0]`);
  }

  // Attach Visual Overlays cleanly using finite -loop 1 -t duration (memory-safe, ~8MB RAM each)
  const hasFilmGrain = cleanOverlays.includes('film_grain');
  let currentBaseLabel = 'base0';

  for (let idx = 0; idx < overlayLayers.length; idx++) {
    const layer = overlayLayers[idx];
    const inStreamIdx = nextInputIdx++;
    args.push('-loop', '1', '-framerate', String(fps), '-t', String(duration), '-i', layer.filePath);

    const prevLabel = currentBaseLabel;
    const isLastOv = idx === overlayLayers.length - 1;
    const nextLabel = isLastOv && !hasFilmGrain ? 'v_out' : `base_ov_${idx}`;
    const ovLabel = `ov${idx}`;

    if (layer.kind === 'scroll_up') {
      const sway = Math.min(Math.max(0, layer.padX - 4), layer.swayAmpX || 24);
      const xExpr = `-${layer.padX}+${sway}*sin(t*${(layer.swayFreq || 0.7).toFixed(2)})`;
      const yExpr = `-mod(t*${layer.speedY || 45},${targetH})`;
      filterGraphParts.push(`[${inStreamIdx}:v]format=rgba[${ovLabel}]`);
      filterGraphParts.push(
        `[${prevLabel}][${ovLabel}]overlay=x='${xExpr}':y='${yExpr}':shortest=1[${nextLabel}]`
      );
    } else if (layer.kind === 'scroll_down') {
      const sway = Math.min(Math.max(0, layer.padX - 4), layer.swayAmpX || 28);
      const xExpr = `-${layer.padX}+${sway}*sin(t*${(layer.swayFreq || 0.7).toFixed(2)})`;
      const yExpr = `-${targetH}+mod(t*${layer.speedY || 110},${targetH})`;
      filterGraphParts.push(`[${inStreamIdx}:v]format=rgba[${ovLabel}]`);
      filterGraphParts.push(
        `[${prevLabel}][${ovLabel}]overlay=x='${xExpr}':y='${yExpr}':shortest=1[${nextLabel}]`
      );
    } else {
      // static_vignette (or fallback static overlay)
      filterGraphParts.push(`[${inStreamIdx}:v]format=rgba[${ovLabel}]`);
      filterGraphParts.push(`[${prevLabel}][${ovLabel}]overlay=0:0:shortest=1[${nextLabel}]`);
    }

    currentBaseLabel = nextLabel;
  }

  if (hasFilmGrain) {
    const grainLevel = Math.max(4, Math.round(4 + 14 * ovIntensityRatio));
    filterGraphParts.push(`[${currentBaseLabel}]format=yuv420p,noise=alls=${grainLevel}:allf=t+u[v]`);
  } else {
    filterGraphParts.push(`[${currentBaseLabel}]format=yuv420p[v]`);
  }

  const volRatio = Math.max(0.05, Math.min(1.0, (musicVolume || 100) / 100));
  const audioInputIdx = nextInputIdx++;
  const finalVideoFilterGraph = filterGraphParts.join(';');

  if (inputMusic && fs.existsSync(inputMusic)) {
    const fadeStart = Math.max(0, duration - 1.5);
    args.push(
      '-stream_loop',
      '-1',
      '-i',
      inputMusic,
      '-filter_complex',
      `${finalVideoFilterGraph};[${audioInputIdx}:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${volRatio.toFixed(2)},afade=t=out:st=${fadeStart}:d=1.5[a]`,
      '-map',
      '[v]',
      '-map',
      '[a]'
    );
  } else {
    args.push(
      '-f',
      'lavfi',
      '-i',
      `anullsrc=channel_layout=stereo:sample_rate=44100:d=${duration}`,
      '-filter_complex',
      finalVideoFilterGraph,
      '-map',
      '[v]',
      '-map',
      `${audioInputIdx}:a`
    );
  }

  // H.264 video encoding settings optimal for mobile reels and all web browsers
  args.push(
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-r',
    '30',
    '-threads',
    '2',
    '-t',
    String(duration),
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ar',
    '44100',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    finalFilePath
  );

  console.log(
    `[server-video-generator] Spawning ffmpeg (layered=${hasLayeredMode}): effects=[${activeEffects.join(',')}], overlays=[${cleanOverlays.join(',')}], duration=${duration}s, hasMusic=${!!inputMusic}`
  );

  try {
    try {
      await runFfmpegSpawn(ffmpegBin, args, 120000);
    } catch (primaryErr: unknown) {
      const pMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      console.error(`[server-video-generator] Primary complex render error: ${pMsg}. Running clean fallback render...`);

      const fallbackSrc = inputLegacyImage || inputFeaturedPhoto || inputFrameLayer!;
      const fallbackArgs: string[] = [
        '-nostats',
        '-loglevel',
        'error',
        '-y',
        '-loop',
        '1',
        '-framerate',
        '30',
        '-t',
        String(duration),
        '-i',
        fallbackSrc,
      ];

      const fallbackFilter = `[0:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=black,fps=30,trim=duration=${duration},setpts=PTS-STARTPTS,format=yuv420p[v]`;

      if (inputMusic && fs.existsSync(inputMusic)) {
        const fadeStart = Math.max(0, duration - 1.5);
        fallbackArgs.push(
          '-stream_loop',
          '-1',
          '-i',
          inputMusic,
          '-filter_complex',
          `${fallbackFilter};[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${volRatio.toFixed(2)},afade=t=out:st=${fadeStart}:d=1.5[a]`,
          '-map',
          '[v]',
          '-map',
          '[a]'
        );
      } else {
        fallbackArgs.push(
          '-f',
          'lavfi',
          '-i',
          `anullsrc=channel_layout=stereo:sample_rate=44100:d=${duration}`,
          '-filter_complex',
          fallbackFilter,
          '-map',
          '[v]',
          '-map',
          '1:a'
        );
      }

      fallbackArgs.push(
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-r',
        '30',
        '-threads',
        '2',
        '-t',
        String(duration),
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-movflags',
        '+faststart',
        finalFilePath
      );

      await runFfmpegSpawn(ffmpegBin, fallbackArgs, 120000);
    }

    if (!fs.existsSync(finalFilePath)) {
      throw new Error('FFmpeg completed but output file was not created.');
    }

    const stats = fs.statSync(finalFilePath);
    console.log(`[server-video-generator] Reel created successfully: ${finalFilename} (${stats.size} bytes)`);

    // Mirror to public_html/uploads/videos if on Hostinger / LiteSpeed web root
    const altPublicHtmlDirs = [
      path.join(process.cwd(), 'public_html', 'uploads', 'videos'),
      path.join(process.cwd(), '..', 'public_html', 'uploads', 'videos'),
      path.join(process.cwd(), '..', '..', 'public_html', 'uploads', 'videos'),
      path.join(process.cwd(), '..', '..', '..', '..', 'public_html', 'uploads', 'videos'),
      '/home/u941411339/domains/game.khabarmonkey.com/public_html/uploads/videos',
    ];
    for (const altDir of altPublicHtmlDirs) {
      try {
        if (!fs.existsSync(altDir)) fs.mkdirSync(altDir, { recursive: true });
        const altFile = path.join(altDir, finalFilename);
        fs.copyFileSync(finalFilePath, altFile);
      } catch {}
    }

    try {
      const videoBuffer = fs.readFileSync(finalFilePath);
      const storageId = publicVideoUrl.replace(/^\/+uploads\/+/, '').replace(/^\/+/, '');
      saveMediaToDb(storageId, 'video/mp4', videoBuffer).catch(() => {});
      saveMediaToDb(finalFilename, 'video/mp4', videoBuffer).catch(() => {});
    } catch (e) {
      console.warn('[server-video-generator] Note on saving video to DB:', e);
    }

    return {
      success: true,
      videoUrl: publicVideoUrl,
      filePath: finalFilePath,
      duration,
      sizeBytes: stats.size,
      effect,
      effects: activeEffects,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[server-video-generator] FFmpeg error:', errorMsg);
    throw new Error(`Video Reel generation failed: ${errorMsg}`);
  } finally {
    for (const tmpPath of createdTmpFiles) {
      if (tmpPath && tmpPath.includes('tmp')) {
        try {
          if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch {}
      }
    }
  }
}
