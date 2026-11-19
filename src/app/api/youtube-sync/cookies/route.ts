import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDbPool } from '@/lib/db/mysql';

const COOKIE_CANDIDATE_PATHS = [
  path.join(process.cwd(), 'cookies.txt'),
  path.join(process.cwd(), 'bin', 'cookies.txt'),
  path.join(process.cwd(), 'public', 'cookies.txt'),
  path.join('/tmp', 'cookies.txt'),
  path.join(process.cwd(), '..', 'cookies.txt'),
  path.join(process.cwd(), '..', '..', 'cookies.txt'),
  '/home/u941411339/domains/game.khabarmonkey.com/cookies.txt',
  '/home/u941411339/domains/game.khabarmonkey.com/public_html/cookies.txt',
];

/**
 * GET /api/youtube-sync/cookies
 * Returns whether YouTube cookies are active on the server
 */
export async function GET() {
  try {
    let foundPath: string | null = null;
    let foundSize = 0;
    let foundTime = new Date().toISOString();

    for (const c of COOKIE_CANDIDATE_PATHS) {
      if (fs.existsSync(c) && fs.statSync(c).size > 50) {
        foundPath = c;
        const st = fs.statSync(c);
        foundSize = st.size;
        foundTime = st.mtime.toISOString();
        break;
      }
    }

    // Fallback: Check MySQL app_user_data for youtube_cookies
    if (!foundPath) {
      try {
        const pool = getDbPool();
        if (pool) {
          const [rows] = await pool.query<any[]>(
            'SELECT youtube_cookies, updated_at FROM app_user_data WHERE youtube_cookies IS NOT NULL AND CHAR_LENGTH(youtube_cookies) > 50 LIMIT 1'
          );
          if (rows && rows.length > 0 && rows[0].youtube_cookies) {
            const content = rows[0].youtube_cookies.trim();
            // Restore to disk
            for (const c of COOKIE_CANDIDATE_PATHS) {
              try {
                const dir = path.dirname(c);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(c, content, 'utf8');
              } catch {}
            }
            return NextResponse.json({
              success: true,
              hasCookies: true,
              fileSizeBytes: content.length,
              updatedAt: rows[0].updated_at || new Date().toISOString(),
              activePath: COOKIE_CANDIDATE_PATHS[0],
              message: 'YouTube cookies.txt restored from database.',
            });
          }
        }
      } catch {}
    }

    if (!foundPath) {
      return NextResponse.json({
        success: true,
        hasCookies: false,
        message: 'No cookies configured yet.',
      });
    }

    return NextResponse.json({
      success: true,
      hasCookies: true,
      fileSizeBytes: foundSize,
      updatedAt: foundTime,
      activePath: foundPath,
      message: 'YouTube cookies.txt is active on server.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/youtube-sync/cookies
 * Uploads or saves cookies.txt on the server to bypass YouTube datacenter bot checks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cookiesContent, email = 'suzaldhiman@gmail.com' } = body;

    if (!cookiesContent || typeof cookiesContent !== 'string' || cookiesContent.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: 'Please provide valid Netscape cookies.txt content.' },
        { status: 400 }
      );
    }

    const cleanContent = cookiesContent.trim();
    let savedAny = false;

    // 1. Save across all standard and persistent candidate paths
    for (const c of COOKIE_CANDIDATE_PATHS) {
      try {
        const dir = path.dirname(c);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(c, cleanContent, 'utf8');
        try { fs.chmodSync(c, 0o644); } catch {}
        savedAny = true;
      } catch {}
    }

    if (!savedAny) {
      fs.writeFileSync(COOKIE_CANDIDATE_PATHS[0], cleanContent, 'utf8');
    }

    // 2. Persist to MySQL database in app_user_data so new builds never lose it
    try {
      const pool = getDbPool();
      if (pool) {
        const [updateRes] = await pool.query<any>(
          'UPDATE app_user_data SET youtube_cookies = ?, updated_at = NOW()',
          [cleanContent]
        );
        if (!updateRes || updateRes.affectedRows === 0) {
          await pool.query(
            'INSERT INTO app_user_data (email, youtube_cookies) VALUES (?, ?) ON DUPLICATE KEY UPDATE youtube_cookies = ?',
            [email || 'suzaldhiman@gmail.com', cleanContent, cleanContent]
          );
        }
        console.log(`[YouTube Cookies] Successfully backed up cookies.txt in MySQL (${cleanContent.length} chars)`);
      }
    } catch (dbErr) {
      console.warn('[YouTube Cookies] Note on saving cookies to MySQL:', dbErr);
    }

    console.log(`[YouTube Cookies] Successfully saved cookies.txt (${cleanContent.length} chars)`);

    return NextResponse.json({
      success: true,
      hasCookies: true,
      fileSizeBytes: cleanContent.length,
      message: 'cookies.txt successfully saved on server! YouTube bot protection bypassed.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[YouTube Cookies POST] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
