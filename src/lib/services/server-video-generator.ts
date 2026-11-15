import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { VideoMotionEffect } from '@/types';

const execFileAsync = promisify(execFile);

// Resolve ffmpeg path safely (supports bundled bin, ffmpeg-static, and system PATH)
function getFfmpegPath(): string {
  // 1. Check local project bin/ directory (e.g. scripts/ensure-ffmpeg.js download)
  const localBin = path.join(process.cwd(), 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (fs.existsSync(localBin)) {
    try {
      fs.chmodSync(localBin, 0o755);
    } catch {
      // ignore chmod error
    }
    return localBin;
  }

  // 2. Check ffmpeg-static
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch (e) {
    console.warn('[server-video-generator] Could not require ffmpeg-static:', e);
  }

  // 3. Common Unix/Linux locations
  const commonLinuxPaths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/bin/ffmpeg'];
  for (const p of commonLinuxPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return 'ffmpeg';
}

export interface GenerateVideoReelOptions {
  imageBase64?: string;
  imageFilePath?: string;
  imageUrl?: string;
  durationSeconds?: number; // default 15
  effect?: VideoMotionEffect; // default 'shake'
  musicUrl?: string; // e.g. "/uploads/audio/track.mp3" or remote URL
  outputFilename?: string;
}

export interface VideoReelResult {
  success: boolean;
  videoUrl: string; // Public URL, e.g. "/uploads/videos/reel_123.mp4"
  filePath: string;
  duration: number;
  sizeBytes: number;
  effect: VideoMotionEffect;
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
    durationSeconds = 15,
    effect = 'shake',
    musicUrl,
    outputFilename,
  } = options;

  const duration = Math.min(Math.max(durationSeconds, 5), 60); // Clamp between 5s and 60s
  const ffmpegBin = getFfmpegPath();

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

  // 4. Build Motion Video Filter Chain
  // All output targets vertical 1080x1920 at 30 fps
  const fps = 30;
  const totalFrames = duration * fps;
  let videoFilter = '';

  switch (effect) {
    case 'shake':
      // High-impact breaking news camera shake/jitter
      videoFilter =
        `scale=1140:2020:force_original_aspect_ratio=increase,` +
        `crop=1080:1920:'30+15*sin(n*0.75)*if(lt(mod(n,75),28),1,0.08)':'50+15*cos(n*0.85)*if(lt(mod(n,75),28),1,0.08)'`;
      break;

    case 'zoom_in':
      // Cinematic slow zoom into the center of the news card
      videoFilter =
        `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,` +
        `zoompan=z='min(zoom+0.0012,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1080x1920:fps=${fps}`;
      break;

    case 'zoom_out':
      // Cinematic slow zoom out revealing the full card
      videoFilter =
        `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,` +
        `zoompan=z='if(lte(zoom,1.0),1.15,max(1.001,zoom-0.0012))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1080x1920:fps=${fps}`;
      break;

    case 'glitter':
      // Shimmering ambient light pulses with subtle zoom (ideal for devotional / celebratory / cultural news)
      videoFilter =
        `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,` +
        `eq=brightness='0.07*sin(2*PI*t*1.4)':saturation='1.0+0.16*cos(2*PI*t*1.4)',` +
        `zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1080x1920:fps=${fps}`;
      break;

    case 'pulse':
      // Rhythmic breathing scale pulse
      videoFilter =
        `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,` +
        `zoompan=z='1.04+0.04*sin(2*PI*t*0.8)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1080x1920:fps=${fps}`;
      break;

    case 'none':
    default:
      // Clean static hold scaled to 1080x1920
      videoFilter = `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2`;
      break;
  }

  // 5. Build FFmpeg Arguments
  const args: string[] = ['-y', '-loop', '1', '-i', inputImage];

  if (inputMusic && fs.existsSync(inputMusic)) {
    // Music provided: Trim to duration and apply smooth 1.5s audio fade-out
    const fadeStart = Math.max(0, duration - 1.5);
    args.push(
      '-i',
      inputMusic,
      '-filter_complex',
      `[0:v]${videoFilter}[v];[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,afade=t=out:st=${fadeStart}:d=1.5[a]`,
      '-map',
      '[v]',
      '-map',
      '[a]'
    );
  } else {
    // No music: Add synthetic silent stereo AAC track (required for valid Instagram & YouTube video containers)
    args.push(
      '-f',
      'lavfi',
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-filter_complex',
      `[0:v]${videoFilter}[v]`,
      '-map',
      '[v]',
      '-map',
      '1:a'
    );
  }

  // H.264 video encoding settings optimal for mobile reels
  args.push(
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'fast',
    '-crf',
    '23',
    '-t',
    String(duration),
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-shortest',
    '-movflags',
    '+faststart',
    finalFilePath
  );

  console.log(`[server-video-generator] Spawning ffmpeg: effect=${effect}, duration=${duration}s, hasMusic=${!!inputMusic}`);

  try {
    await execFileAsync(ffmpegBin, args, { timeout: 60000 });

    if (!fs.existsSync(finalFilePath)) {
      throw new Error('FFmpeg completed but output file was not created.');
    }

    const stats = fs.statSync(finalFilePath);
    console.log(`[server-video-generator] Reel created successfully: ${finalFilename} (${stats.size} bytes)`);

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
