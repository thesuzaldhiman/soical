import fs from 'fs';
import path from 'path';
import https from 'https';
import zlib from 'zlib';
import { spawn } from 'child_process';
import { VideoMotionEffect, VideoOverlayType } from '@/types';
import { saveMediaToDb, getMediaFromDb } from '@/lib/db/mysql';

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
      if (stderr.length > 8000) {
        stderr = stderr.slice(-8000);
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
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.trim()}`));
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
async function resolveMediaToLocal(mediaInput?: string, tempPrefix = 'media', ext = '.png'): Promise<string | null> {
  if (!mediaInput || typeof mediaInput !== 'string') return null;
  const trimmed = mediaInput.trim();

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
    return tempFile;
  }

  // Handle existing local file path (e.g. /uploads/...)
  const cleanPath = trimmed.replace(/^\/+/, '');
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
      return tempFile;
    }
  } catch (dbErr) {
    console.warn('[server-video-generator] DB media fallback error:', dbErr);
  }

  // Handle remote HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const res = await fetch(trimmed, {
        headers: { 'User-Agent': 'Mozilla/5.0 SocialAutoPoster/1.0' },
      });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const tempFile = path.join(tempDir, `${tempPrefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`);
      fs.writeFileSync(tempFile, buf);
      return tempFile;
    } catch (err) {
      console.error(`[server-video-generator] Error fetching ${trimmed}:`, err);
      return null;
    }
  }

  return null;
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

  // Motion Intensity: 5 to 100 (%) - default 20% (Subtle & Readable)
  const mIntensity = Math.max(5, Math.min(100, Number(motionIntensity) || 20));
  const intensityRatio = mIntensity / 100; // 0.05 to 1.0 (default 0.20)

  // Overlay Intensity: 10 to 100 (%) - default 50%
  const oIntensity = Math.max(10, Math.min(100, Number(overlayIntensity) || 50));
  const ovIntensityRatio = oIntensity / 100; // 0.1 to 1.0 (default 0.50)

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

  // 1. Resolve Input Image
  const inputImage =
    (await resolveMediaToLocal(imageBase64, 'frame', '.png')) ||
    (await resolveMediaToLocal(imageUrl, 'frame', '.png')) ||
    (imageFilePath && fs.existsSync(imageFilePath) ? imageFilePath : null);

  if (!inputImage) {
    throw new Error('No valid input image provided for video reel generation.');
  }

  // 2. Resolve Input Music (if provided)
  const inputMusic = musicUrl ? await resolveMediaToLocal(musicUrl, 'audio', '.mp3') : null;

  // 3. Prepare Output Path
  const cleanBaseName = outputFilename
    ? outputFilename.replace(/[^a-zA-Z0-9_-]/g, '_')
    : `reel_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const finalFilename = `${cleanBaseName}.mp4`;
  const finalFilePath = path.join(videosDir, finalFilename);
  const publicVideoUrl = `/uploads/videos/${finalFilename}`;

  // 4. Build Combined Multi-Motion Video Filter Chain
  const fps = 30;
  const totalFrames = duration * fps;
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
  const hasPulse = activeEffects.includes('pulse');
  const hasGlitter = activeEffects.includes('glitter');

  const filterChain: string[] = [];

  // Motion margin padding (2% to 5% based on intensity)
  const padRatio = Math.max(0.02, Math.min(0.06, 0.02 + 0.03 * intensityRatio));
  const padX = Math.round((targetW * padRatio) / 2) * 2;
  const padY = Math.round((targetH * padRatio) / 2) * 2;
  const scaledW = targetW + padX * 2;
  const scaledH = targetH + padY * 2;

  const needsScaleUp =
    hasSubtleFloat ||
    hasMicroJitter ||
    hasSmoothSway ||
    hasVerticalDrift ||
    hasPulseShake ||
    hasShake ||
    hasJitter;

  // Step A: Base Scale & Crop
  if (needsScaleUp) {
    filterChain.push(`scale=${scaledW}:${scaledH}:force_original_aspect_ratio=increase`);

    if (hasMicroJitter) {
      // Handheld camera micro-tremble: displacement ~1-2.5px, slow frequency, 100% readable text
      const ampX = (1.5 * intensityRatio).toFixed(2);
      const ampY = (1.8 * intensityRatio).toFixed(2);
      filterChain.push(
        `crop=${targetW}:${targetH}:'${padX}+${ampX}*sin(n*0.35)*if(lt(n,${animFrames}),1,0)':'${padY}+${ampY}*cos(n*0.42)*if(lt(n,${animFrames}),1,0)'`
      );
    } else if (hasSubtleFloat) {
      // Slow gentle floating/breathing: displacement ~2.5-4px, very slow frequency
      const ampX = (2.5 * intensityRatio).toFixed(2);
      const ampY = (3.0 * intensityRatio).toFixed(2);
      filterChain.push(
        `crop=${targetW}:${targetH}:'${padX}+${ampX}*sin(n*0.12)*if(lt(n,${animFrames}),1,0)':'${padY}+${ampY}*cos(n*0.10)*if(lt(n,${animFrames}),1,0)'`
      );
    } else if (hasSmoothSway) {
      // Horizontal cinematic pan sway
      const ampX = Math.max(4, Math.round(padX * 0.7 * intensityRatio));
      filterChain.push(
        `crop=${targetW}:${targetH}:'${padX}+${ampX}*sin(2*PI*n/(${fps}*4))*if(lt(n,${animFrames}),1,0)':'${padY}'`
      );
    } else if (hasVerticalDrift) {
      // Vertical gentle bob
      const ampY = Math.max(4, Math.round(padY * 0.7 * intensityRatio));
      filterChain.push(
        `crop=${targetW}:${targetH}:'${padX}':'${padY}+${ampY}*sin(2*PI*n/(${fps}*5))*if(lt(n,${animFrames}),1,0)'`
      );
    } else if (hasJitter) {
      // Alert strobe jitter (scaled down so headline is readable)
      const ampX = Math.max(2, Math.round(5 * intensityRatio));
      const ampY = Math.max(2, Math.round(6 * intensityRatio));
      filterChain.push(
        `crop=${targetW}:${targetH}:'${padX}+${ampX}*sin(n*0.6)*if(lt(n,${animFrames}),1,0)':'${padY}+${ampY}*cos(n*0.7)*if(lt(n,${animFrames}),1,0)'`
      );
      filterChain.push(
        `eq=brightness='${(0.04 * intensityRatio).toFixed(3)}*if(lt(mod(n,45),5)*lt(n,${animFrames}),1,0)'`
      );
    } else if (hasShake) {
      // Mild impact camera shake (scaled down so headline is readable)
      const ampX = Math.max(2, Math.round(4.5 * intensityRatio));
      const ampY = Math.max(2, Math.round(4.5 * intensityRatio));
      filterChain.push(
        `crop=${targetW}:${targetH}:'${padX}+${ampX}*sin(n*0.35)*if(lt(mod(n,60),20)*lt(n,${animFrames}),1,0.05)':'${padY}+${ampY}*cos(n*0.4)*if(lt(mod(n,60),20)*lt(n,${animFrames}),1,0.05)'`
      );
    } else if (hasPulseShake) {
      const ampX = (1.5 * intensityRatio).toFixed(2);
      const ampY = (1.5 * intensityRatio).toFixed(2);
      filterChain.push(
        `crop=${targetW}:${targetH}:'${padX}+${ampX}*sin(n*0.3)*if(lt(n,${animFrames}),1,0)':'${padY}+${ampY}*cos(n*0.3)*if(lt(n,${animFrames}),1,0)'`
      );
    }
  } else if (hasPanLeft) {
    const panW = targetW + Math.round(targetW * 0.15);
    filterChain.push(`scale=${panW}:${targetH}:force_original_aspect_ratio=increase`);
    filterChain.push(
      `crop=${targetW}:${targetH}:'(${panW}-${targetW})*if(lt(n,${animFrames}),1-n/${animFrames},0)':0`
    );
  } else if (hasPanRight) {
    const panW = targetW + Math.round(targetW * 0.15);
    filterChain.push(`scale=${panW}:${targetH}:force_original_aspect_ratio=increase`);
    filterChain.push(
      `crop=${targetW}:${targetH}:'(${panW}-${targetW})*if(lt(n,${animFrames}),n/${animFrames},1)':0`
    );
  } else {
    filterChain.push(
      `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=black`
    );
  }

  // Step B: Zoom / Pan / Breathing Pulse (Spatial Animation)
  if (hasZoomIn) {
    const zoomRate = (0.0003 + 0.0006 * intensityRatio).toFixed(5);
    const maxZ = (1.04 + 0.08 * intensityRatio).toFixed(3);
    filterChain.push(
      `zoompan=z='if(lt(on,${animFrames}),min(zoom+${zoomRate},${maxZ}),${maxZ})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${targetW}x${targetH}:fps=${fps}`
    );
  } else if (hasZoomOut) {
    const zoomRate = (0.0003 + 0.0006 * intensityRatio).toFixed(5);
    const maxZ = (1.05 + 0.08 * intensityRatio).toFixed(3);
    filterChain.push(
      `zoompan=z='if(lt(on,${animFrames}),if(lte(zoom,1.0),${maxZ},max(1.001,zoom-${zoomRate})),1.001)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${targetW}x${targetH}:fps=${fps}`
    );
  } else if (hasPulse || hasPulseShake) {
    const pulseAmp = (0.015 * intensityRatio).toFixed(3);
    filterChain.push(
      `zoompan=z='if(lt(on,${animFrames}),1.01+${pulseAmp}*sin(2*PI*(on/${fps})*0.8),1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${targetW}x${targetH}:fps=${fps}`
    );
  }

  // Step C: Glitter (Ambient Shimmer Pulses)
  if (hasGlitter) {
    filterChain.push(
      `eq=brightness='${(0.04 * intensityRatio).toFixed(3)}*sin(2*PI*t*1.4)':saturation='1.0+${(0.12 * intensityRatio).toFixed(3)}*cos(2*PI*t*1.4)':enable='between(t,0,${animDuration})'`
    );
  }

  // Step D: Apply Atmospheric Visual Overlays (snow, dust, glitter, bokeh, embers)
  if (Array.isArray(overlays) && overlays.length > 0) {
    for (const ov of overlays) {
      if (ov === 'vignette') {
        filterChain.push('vignette=PI/4');
      } else if (ov === 'film_grain') {
        const grainLevel = Math.max(3, Math.round(5 + 10 * ovIntensityRatio));
        filterChain.push(`noise=alls=${grainLevel}:allf=t+u`);
      } else if (ov === 'particle_snow') {
        // Delicate soft snow shimmer pulse
        filterChain.push(
          `eq=brightness='${(0.03 * ovIntensityRatio).toFixed(3)}*sin(2*PI*t*1.2)':saturation='1.0+${(0.06 * ovIntensityRatio).toFixed(3)}*cos(2*PI*t*1.2)'`
        );
      } else if (ov === 'floating_dust' || ov === 'particles') {
        // Atmospheric floating dust with subtle ambient grain
        const dustGrain = Math.max(2, Math.round(3 + 6 * ovIntensityRatio));
        filterChain.push(`noise=alls=${dustGrain}:allf=t+u`);
        filterChain.push(`eq=brightness='${(0.025 * ovIntensityRatio).toFixed(3)}*sin(2*PI*t*0.9)'`);
      } else if (ov === 'glitter_sparkle') {
        // Diamond / gold sparkle shimmer
        filterChain.push(
          `eq=brightness='${(0.045 * ovIntensityRatio).toFixed(3)}*sin(2*PI*t*1.6)':saturation='1.0+${(0.15 * ovIntensityRatio).toFixed(3)}*cos(2*PI*t*1.6)'`
        );
      } else if (ov === 'bokeh_lights') {
        // Soft glowing ambient bokeh breathing warmth
        filterChain.push(
          `eq=brightness='${(0.04 * ovIntensityRatio).toFixed(3)}*sin(2*PI*t*0.7)':saturation='1.0+${(0.10 * ovIntensityRatio).toFixed(3)}*sin(2*PI*t*0.7)'`
        );
      } else if (ov === 'fire_embers') {
        // Warm glowing embers hue pulse
        filterChain.push(
          `eq=gamma_r='1.0+${(0.08 * ovIntensityRatio).toFixed(3)}*sin(2*PI*t*1.1)':brightness='${(0.025 * ovIntensityRatio).toFixed(3)}*sin(2*PI*t*1.1)'`
        );
      }
    }
  }

  const videoFilter = filterChain.join(',');

  // 5. Build FFmpeg Arguments (with -nostats & -loglevel error to prevent maxBuffer stderr overflow)
  const args: string[] = [
    '-nostats',
    '-loglevel',
    'error',
    '-y',
    '-loop',
    '1',
    '-framerate',
    '30',
    '-i',
    inputImage,
  ];

  const volRatio = Math.max(0.05, Math.min(1.0, (musicVolume || 100) / 100));

  if (inputMusic && fs.existsSync(inputMusic)) {
    // Music provided: Loop music if shorter than duration, trim to duration, scale volume, and apply smooth 1.5s audio fade-out
    const fadeStart = Math.max(0, duration - 1.5);
    args.push(
      '-stream_loop',
      '-1',
      '-i',
      inputMusic,
      '-filter_complex',
      `[0:v]${videoFilter},fps=30,trim=duration=${duration},setpts=PTS-STARTPTS[v];[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${volRatio.toFixed(2)},afade=t=out:st=${fadeStart}:d=1.5[a]`,
      '-map',
      '[v]',
      '-map',
      '[a]'
    );
  } else {
    // No music: Add synthetic silent stereo AAC track with explicit duration
    args.push(
      '-f',
      'lavfi',
      '-i',
      `anullsrc=channel_layout=stereo:sample_rate=44100:d=${duration}`,
      '-filter_complex',
      `[0:v]${videoFilter},fps=30,trim=duration=${duration},setpts=PTS-STARTPTS[v]`,
      '-map',
      '[v]',
      '-map',
      '1:a'
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

  console.log(`[server-video-generator] Spawning ffmpeg from '${ffmpegBin}': effect=${effect}, duration=${duration}s, hasMusic=${!!inputMusic}`);

  try {
    await runFfmpegSpawn(ffmpegBin, args, 120000);

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
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[server-video-generator] FFmpeg error:', errorMsg);
    throw new Error(`Video Reel generation failed: ${errorMsg}`);
  } finally {
    // Clean up temporary image frame if it was generated in tmp
    if (inputImage && inputImage.includes('/uploads/tmp/')) {
      try {
        fs.unlinkSync(inputImage);
      } catch {
        // ignore cleanup error
      }
    }
  }
}
