import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMediaFromDb, saveMediaToDb } from '@/lib/db/mysql';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await context.params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Sanitize relative path and prevent directory traversal
    const rawPath = pathSegments.join('/');
    const cleanRelPath = path.normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filename = path.basename(cleanRelPath);

    // Candidates on disk
    const diskCandidates = [
      path.join(process.cwd(), 'public', 'uploads', cleanRelPath),
      path.join(process.cwd(), 'public_html', 'uploads', cleanRelPath),
      path.join(process.cwd(), 'uploads', cleanRelPath),
      path.join(process.cwd(), 'public', 'uploads', filename),
    ];

    let foundPath: string | null = null;
    for (const cand of diskCandidates) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        foundPath = cand;
        break;
      }
    }

    // If not found on disk, attempt to fetch from MySQL app_media_storage
    let dbBuffer: Buffer | null = null;
    let dbMime = '';

    if (!foundPath) {
      const dbMedia =
        (await getMediaFromDb(cleanRelPath)) ||
        (await getMediaFromDb(filename)) ||
        (await getMediaFromDb(`uploads/${cleanRelPath}`));

      if (dbMedia && dbMedia.data) {
        dbBuffer = dbMedia.data;
        dbMime = dbMedia.mimeType || getMimeType(filename);

        // Cache back to disk
        try {
          const targetDir = path.join(process.cwd(), 'public', 'uploads', path.dirname(cleanRelPath));
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          const targetFile = path.join(process.cwd(), 'public', 'uploads', cleanRelPath);
          fs.writeFileSync(targetFile, dbBuffer);
          foundPath = targetFile;
        } catch {
          // Non-blocking disk write
        }
      }
    }

    // If still not found and no DB buffer, 404
    if (!foundPath && !dbBuffer) {
      return new NextResponse('Media file not found', { status: 404 });
    }

    const mimeType = dbMime || (foundPath ? getMimeType(foundPath) : 'application/octet-stream');

    // Handle from DB buffer if file write failed
    if (!foundPath && dbBuffer) {
      return new NextResponse(new Uint8Array(dbBuffer), {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(dbBuffer.length),
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Handle from disk path
    if (foundPath) {
      const stats = fs.statSync(foundPath);
      const totalSize = stats.size;
      const range = request.headers.get('range');

      // Video & Audio HTTP Range Streaming (Required for Seeking and Safari playback)
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (start >= totalSize || end >= totalSize) {
          return new NextResponse('Requested range not satisfiable', {
            status: 416,
            headers: {
              'Content-Range': `bytes */${totalSize}`,
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(foundPath, { start, end });
        const webStream = new ReadableStream({
          start(controller) {
            fileStream.on('data', (chunk) => controller.enqueue(chunk));
            fileStream.on('end', () => controller.close());
            fileStream.on('error', (err) => controller.error(err));
          },
        });

        return new NextResponse(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Normal full-file response
      const buffer = fs.readFileSync(foundPath);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(totalSize),
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    return new NextResponse('File not found', { status: 404 });
  } catch (err) {
    console.error('[Uploads Route] Streaming error:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
