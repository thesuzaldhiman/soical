import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { saveMediaToDb } from '@/lib/db/mysql';

/**
 * Offloads a base64 data URI to a static file in public/uploads/
 * and saves to MySQL app_media_storage, returning the static URL (/uploads/media_<hash>.<ext>).
 * If the string is already a URL or empty, returns it as-is.
 */
export function offloadBase64Media(rawUrl: string | undefined): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  if (!rawUrl.startsWith('data:')) return rawUrl;

  try {
    const matches = rawUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return rawUrl;

    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let ext = '.png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('gif')) ext = '.gif';
    else if (mimeType.includes('mp4')) ext = '.mp4';
    else if (mimeType.includes('webm')) ext = '.webm';

    // Hash the buffer to avoid duplicate files for identical media
    const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 16);
    const filename = `media_${hash}${ext}`;

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, buffer);
    }

    // Persist to MySQL for permanence across deployments
    saveMediaToDb(filename, mimeType, buffer).catch(() => {});

    return `/uploads/${filename}`;
  } catch (err) {
    console.warn('[offloadBase64Media] Failed to offload base64:', err);
    return rawUrl;
  }
}

/**
 * Deeply traverses any object, array, or primitive and offloads any
 * data:image/* or data:video/* base64 string to public/uploads/.
 */
export function sanitizeDeepMedia<T>(val: T, depth = 0): T {
  if (depth > 12) return val;
  if (!val) return val;

  if (typeof val === 'string') {
    if (val.startsWith('data:image/') || val.startsWith('data:video/')) {
      return (offloadBase64Media(val) as unknown) as T;
    }
    return val;
  }

  if (Array.isArray(val)) {
    return (val.map((item) => sanitizeDeepMedia(item, depth + 1)) as unknown) as T;
  }

  if (typeof val === 'object') {
    const copy: any = Array.isArray(val) ? [] : {};
    for (const [k, v] of Object.entries(val)) {
      copy[k] = sanitizeDeepMedia(v, depth + 1);
    }
    return copy as T;
  }

  return val;
}

/**
 * Iterates through a post and converts any base64 mediaUrl or thumbnailUrl
 * into lightweight static URLs.
 */
export function sanitizePostMedia<T extends { mediaUrl?: string; thumbnailUrl?: string }>(post: T): T {
  return sanitizeDeepMedia(post);
}
