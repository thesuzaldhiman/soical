import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDbPool, initDbTables } from '@/lib/db/mysql';

export async function GET(request: NextRequest) {
  try {
    const zipPath = path.join(process.cwd(), 'public', 'downloads', 'social-auto-poster-connector.zip');

    // 1. Check if MySQL table exists and record info
    try {
      const pool = getDbPool();
      if (pool) {
        await initDbTables();
        const [rows] = await pool.query<any[]>(
          'SELECT id, name, version FROM wp_plugins WHERE id = ? LIMIT 1',
          ['social-auto-poster-connector']
        );
        if (rows && rows.length > 0) {
          console.log('[WP Plugin Download] Serving plugin record from MySQL catalog:', rows[0].name);
        }
      }
    } catch (dbErr) {
      console.warn('[WP Plugin Download] DB check bypassed:', dbErr);
    }

    // 2. Read physical zip file
    if (!fs.existsSync(zipPath)) {
      return NextResponse.json(
        { error: 'Plugin archive not found on server.' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(zipPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="social-auto-poster-connector.zip"',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to serve plugin';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
