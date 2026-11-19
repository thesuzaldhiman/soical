import fs from 'fs';
import path from 'path';
import https from 'https';
import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

let cachedYtDlpPath: string | null = null;

const COMPATIBLE_YTDLP_VERSION = '2025.10.14';
const COMPATIBLE_DOWNLOAD_URL = `https://github.com/yt-dlp/yt-dlp/releases/download/${COMPATIBLE_YTDLP_VERSION}/yt-dlp`;

/**
 * Tests if a candidate yt-dlp binary is compatible with available Python runtime
 */
function isBinaryCompatible(binPath: string): boolean {
  try {
    if (!fs.existsSync(binPath) || fs.statSync(binPath).size < 1000000) return false;
    const pythonCandidates = [
      'python3',
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      '/opt/alt/python311/bin/python3',
      '/opt/alt/python312/bin/python3',
      'python',
    ];
    for (const py of pythonCandidates) {
      try {
        const out = execFileSync(py, [binPath, '--version'], {
          timeout: 4000,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        if (out && out.trim().length > 0) return true;
      } catch (err: any) {
        const stderr = (err?.stderr || err?.message || '').toString();
        if (stderr.includes('unsupported version of Python')) {
          console.warn(`[server-youtube-downloader] Binary at ${binPath} rejected: unsupported Python version`);
          return false;
        }
      }
    }

    // Try direct execution as fallback
    try {
      const out = execFileSync(binPath, ['--version'], {
        timeout: 4000,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      if (out && out.trim().length > 0) return true;
    } catch (err: any) {
      const stderr = (err?.stderr || err?.message || '').toString();
      if (stderr.includes('unsupported version of Python')) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Downloads a standalone executable to target destination with redirects
 */
async function downloadBinaryTo(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const dir = path.dirname(dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const req = https.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadBinaryTo(res.headers.location, dest).then(resolve);
        }
        if (res.statusCode !== 200) {
          console.warn(`[server-youtube-downloader] Binary download failed: ${res.statusCode}`);
          return resolve(false);
        }

        const fileStream = fs.createWriteStream(dest);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            try {
              fs.chmodSync(dest, 0o755);
            } catch {}
            console.log(`[server-youtube-downloader] Downloaded yt-dlp binary to: ${dest}`);
            resolve(true);
          });
        });

        fileStream.on('error', (err) => {
          console.warn('[server-youtube-downloader] FileStream error:', err.message);
          resolve(false);
        });
      });

      req.on('error', (err) => {
        console.warn('[server-youtube-downloader] Request error:', err.message);
        resolve(false);
      });
      req.setTimeout(45000, () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Resolves the path to the Python 3.9-compatible yt-dlp executable
 */
export async function getYtDlpPath(): Promise<string> {
  if (cachedYtDlpPath && fs.existsSync(cachedYtDlpPath) && isBinaryCompatible(cachedYtDlpPath)) {
    return cachedYtDlpPath;
  }

  const binaryName = 'yt-dlp';
  // Check build directory first, then fallback locations
  const candidatePaths = [
    path.join(process.cwd(), 'bin', binaryName),
    path.join(process.cwd(), 'public', 'bin', binaryName),
    path.join(__dirname, '..', '..', '..', 'bin', binaryName),
    path.join(__dirname, '..', '..', '..', 'public', 'bin', binaryName),
    path.join('/tmp', binaryName),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).size > 1000000) {
        if (isBinaryCompatible(p)) {
          try { fs.chmodSync(p, 0o755); } catch {}
          cachedYtDlpPath = p;
          return p;
        } else {
          // If in /tmp, remove incompatible binary
          if (p.startsWith('/tmp')) {
            try { fs.unlinkSync(p); } catch {}
          }
        }
      }
    } catch {}
  }

  // Common Linux system binaries
  const commonLinuxPaths = ['/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp'];
  for (const p of commonLinuxPaths) {
    if (fs.existsSync(p) && isBinaryCompatible(p)) {
      cachedYtDlpPath = p;
      return p;
    }
  }

  // Dynamic on-demand download fallback (universal standalone Python 3.9 compatible zipapp)
  const tmpDest = path.join(process.cwd(), 'bin', binaryName);
  const fallbackTmpDest = path.join('/tmp', binaryName);

  console.log(`[server-youtube-downloader] Downloading Python 3.9-compatible yt-dlp on-demand to ${tmpDest}...`);
  let ok = await downloadBinaryTo(COMPATIBLE_DOWNLOAD_URL, tmpDest);
  if (!ok) {
    ok = await downloadBinaryTo(COMPATIBLE_DOWNLOAD_URL, fallbackTmpDest);
    if (ok && fs.existsSync(fallbackTmpDest)) {
      cachedYtDlpPath = fallbackTmpDest;
      return fallbackTmpDest;
    }
  } else if (fs.existsSync(tmpDest)) {
    cachedYtDlpPath = tmpDest;
    return tmpDest;
  }

  return 'yt-dlp';
}

/**
 * Finds local FFmpeg binary path for audio-video merging
 */
function getLocalFfmpegDir(): string | null {
  const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const candidatePaths = [
    path.join(process.cwd(), 'bin', binaryName),
    path.join(process.cwd(), 'public', 'bin', binaryName),
    path.join('/tmp', binaryName),
    path.join('/usr/local/bin', binaryName),
    path.join('/usr/bin', binaryName),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return path.dirname(p);
    }
  }
  return null;
}

export interface ResolvedYouTubeChannel {
  channelId: string;
  channelTitle: string;
  channelHandle?: string;
  channelAvatar?: string;
  feedUrl: string;
  canonicalUrl: string;
}

/**
 * Resolves any YouTube URL, handle (@name), or Channel ID into authoritative metadata
 */
export async function resolveYouTubeChannel(input: string): Promise<ResolvedYouTubeChannel> {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('YouTube channel URL or handle is required');

  let targetUrl = trimmed;

  // Handle bare handle "@name"
  if (trimmed.startsWith('@')) {
    targetUrl = `https://www.youtube.com/${trimmed}`;
  } else if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    if (trimmed.startsWith('UC') && trimmed.length >= 20) {
      targetUrl = `https://www.youtube.com/channel/${trimmed}`;
    } else {
      targetUrl = `https://www.youtube.com/@${trimmed}`;
    }
  }

  console.log(`[YouTube Downloader] Resolving channel from: ${targetUrl}`);

  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Failed to access YouTube channel (HTTP ${res.status})`);
  }

  const html = await res.text();

  // 1. Extract Channel ID (UC...)
  const channelIdMatch =
    html.match(/channel_id=([a-zA-Z0-9_-]{20,30})/i) ||
    html.match(/<meta[^>]+itemprop=["']channelId["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/["']browseId["']:\s*["'](UC[a-zA-Z0-9_-]{20,24})["']/i) ||
    html.match(/["']externalId["']:\s*["'](UC[a-zA-Z0-9_-]{20,24})["']/i) ||
    html.match(/\/channel\/(UC[a-zA-Z0-9_-]{20,24})/i);

  const channelId = channelIdMatch ? channelIdMatch[1] : null;
  if (!channelId || !channelId.startsWith('UC')) {
    throw new Error('Could not detect valid YouTube Channel ID from the provided URL or handle.');
  }

  // 2. Extract Channel Title
  const titleMatch =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<title>([^<]+)<\/title>/i);
  let channelTitle = titleMatch ? titleMatch[1].replace(/ - YouTube$/, '').trim() : 'YouTube Channel';

  // 3. Extract Avatar
  const avatarMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
  const channelAvatar = avatarMatch ? avatarMatch[1].trim() : undefined;

  // 4. Extract Handle
  const handleMatch =
    targetUrl.match(/@([a-zA-Z0-9_.-]+)/) ||
    html.match(/["']canonicalBaseUrl["']:\s*["']\/@([a-zA-Z0-9_.-]+)["']/i);
  const channelHandle = handleMatch ? `@${handleMatch[1]}` : undefined;

  return {
    channelId,
    channelTitle,
    channelHandle,
    channelAvatar,
    feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    canonicalUrl: `https://www.youtube.com/channel/${channelId}`,
  };
}

export interface YouTubeFeedVideo {
  id: string; // Video ID
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  watchUrl: string;
  isShort?: boolean;
}

/**
 * Fetches the latest published videos from a YouTube channel via official RSS feed
 */
export async function fetchChannelLatestVideos(channelId: string, limit = 15): Promise<YouTubeFeedVideo[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  console.log(`[YouTube Downloader] Fetching feed: ${feedUrl}`);

  const res = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SocialAutoPoster/1.0',
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube XML feed (HTTP ${res.status})`);
  }

  const xml = await res.text();
  const videos: YouTubeFeedVideo[] = [];

  // Parse <entry> blocks using regex (zero-dependency, robust across environments)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xml)) !== null && videos.length < limit) {
    const entryBlock = match[1];

    const videoIdMatch = entryBlock.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i);
    const titleMatch = entryBlock.match(/<title>([\s\S]*?)<\/title>/i);
    const descMatch = entryBlock.match(/<media:description>([\s\S]*?)<\/media:description>/i);
    const pubMatch = entryBlock.match(/<published>([^<]+)<\/published>/i);
    const thumbMatch = entryBlock.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);

    if (videoIdMatch && videoIdMatch[1]) {
      const vId = videoIdMatch[1].trim();
      const rawTitle = titleMatch ? titleMatch[1].trim() : 'Video';
      // Decode XML entities
      const cleanTitle = rawTitle
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const rawDesc = descMatch ? descMatch[1].trim() : '';
      const cleanDesc = rawDesc
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      videos.push({
        id: vId,
        title: cleanTitle,
        description: cleanDesc,
        publishedAt: pubMatch ? pubMatch[1].trim() : new Date().toISOString(),
        thumbnailUrl: thumbMatch ? thumbMatch[1].trim() : `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
        watchUrl: `https://www.youtube.com/watch?v=${vId}`,
      });
    }
  }

  return videos;
}

/**
 * Fast check to determine if a video is a YouTube Short (< 60s vertical)
 */
export async function checkIfVideoIsShort(videoId: string): Promise<boolean> {
  try {
    const shortUrl = `https://www.youtube.com/shorts/${videoId}`;
    const res = await fetch(shortUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      redirect: 'manual',
    });

    // If HTTP 200 or 303 without redirecting to /watch?v=, it's a Short!
    if (res.status === 200) return true;
    const loc = res.headers.get('location') || '';
    if (loc.includes('/watch?v=')) return false;
    if (loc.includes('/shorts/')) return true;

    return false;
  } catch {
    return false;
  }
}

export interface DownloadedYouTubeVideoResult {
  success: boolean;
  videoId: string;
  localFilePath: string;
  publicUrl: string;
  fileSizeBytes: number;
  durationSeconds?: number;
  title: string;
  isShort: boolean;
}

/**
 * Downloads a YouTube video or short into an MP4 file on the local server
 */
export async function downloadYouTubeVideo(
  videoId: string,
  outputFilename?: string
): Promise<DownloadedYouTubeVideoResult> {
  const cleanId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
  const watchUrl = `https://www.youtube.com/watch?v=${cleanId}`;

  const ytVideosDir = path.join(process.cwd(), 'public', 'uploads', 'youtube_videos');
  if (!fs.existsSync(ytVideosDir)) {
    fs.mkdirSync(ytVideosDir, { recursive: true });
  }

  const baseName = outputFilename
    ? outputFilename.replace(/[^a-zA-Z0-9_-]/g, '_')
    : `yt_${cleanId}_${Date.now()}`;
  const finalFilename = `${baseName}.mp4`;
  const finalFilePath = path.join(ytVideosDir, finalFilename);
  const publicVideoUrl = `/uploads/youtube_videos/${finalFilename}`;

  const ytdlpBin = await getYtDlpPath();
  const ffmpegDir = getLocalFfmpegDir();

  const isShort = await checkIfVideoIsShort(cleanId);

  console.log(`[YouTube Downloader] Starting download for ${cleanId} (isShort: ${isShort}) using binary: ${ytdlpBin}`);

  const args: string[] = [
    '--no-playlist',
    '--no-warnings',
    '--no-update',
    '--extractor-args',
    'youtube:player_client=android,web',
    '-f',
    'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '--merge-output-format',
    'mp4',
    '-o',
    finalFilePath,
  ];

  if (ffmpegDir) {
    args.push('--ffmpeg-location', ffmpegDir);
  }

  // Add the YouTube URL
  args.push(watchUrl);

  // Setup local temp directory inside project to avoid Linux noexec /tmp restrictions
  const localTmpDir = path.join(process.cwd(), '.tmp');
  if (!fs.existsSync(localTmpDir)) {
    try { fs.mkdirSync(localTmpDir, { recursive: true }); } catch {}
  }

  const customEnv = {
    ...process.env,
    TMPDIR: localTmpDir,
    PYINSTALLER_TMPDIR: localTmpDir,
    TEMP: localTmpDir,
    TMP: localTmpDir,
  };

  try {
    let executed = false;
    let lastError: Error | null = null;

    // Attempt 1: Run via available python3 executables (CloudLinux / CentOS / cPanel / AlmaLinux)
    const pythonCandidates = [
      'python3',
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      '/opt/alt/python311/bin/python3',
      '/opt/alt/python312/bin/python3',
      'python',
    ];

    for (const py of pythonCandidates) {
      if (executed) break;
      try {
        console.log(`[YouTube Downloader] Attempting execution via ${py} for ${cleanId}...`);
        await execFileAsync(py, [ytdlpBin, ...args], {
          timeout: 180000,
          maxBuffer: 15 * 1024 * 1024,
          env: customEnv,
        });
        executed = true;
      } catch (pyErr: any) {
        const msg = (pyErr?.stderr || pyErr?.message || '').toString();
        console.warn(`[YouTube Downloader] ${py} execution note:`, msg.substring(0, 150));
        lastError = pyErr instanceof Error ? pyErr : new Error(String(pyErr));
      }
    }

    // Attempt 2: Direct binary execution with non-tmp TMPDIR
    if (!executed) {
      console.log(`[YouTube Downloader] Attempting direct binary execution for ${cleanId}...`);
      await execFileAsync(ytdlpBin, args, {
        timeout: 180000,
        maxBuffer: 15 * 1024 * 1024,
        env: customEnv,
      });
      executed = true;
    }

    if (!fs.existsSync(finalFilePath) || fs.statSync(finalFilePath).size < 1000) {
      throw new Error(`Download completed but output file is missing or invalid.`);
    }

    const stat = fs.statSync(finalFilePath);
    console.log(`[YouTube Downloader] Successfully downloaded ${cleanId} (${stat.size} bytes) -> ${publicVideoUrl}`);

    return {
      success: true,
      videoId: cleanId,
      localFilePath: finalFilePath,
      publicUrl: publicVideoUrl,
      fileSizeBytes: stat.size,
      title: baseName,
      isShort,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[YouTube Downloader] Error downloading ${cleanId}:`, msg);
    throw new Error(`Failed to download YouTube video: ${msg}`);
  }
}
