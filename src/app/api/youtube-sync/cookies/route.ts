import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const COOKIES_PATH = path.join(process.cwd(), 'cookies.txt');

/**
 * GET /api/youtube-sync/cookies
 * Returns whether YouTube cookies are active on the server
 */
export async function GET() {
  try {
    const exists = fs.existsSync(COOKIES_PATH);
    if (!exists) {
      return NextResponse.json({
        success: true,
        hasCookies: false,
        message: 'No cookies configured yet.',
      });
    }

    const stat = fs.statSync(COOKIES_PATH);
    return NextResponse.json({
      success: true,
      hasCookies: true,
      fileSizeBytes: stat.size,
      updatedAt: stat.mtime.toISOString(),
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
    const { cookiesContent } = body;

    if (!cookiesContent || typeof cookiesContent !== 'string' || cookiesContent.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: 'Please provide valid Netscape cookies.txt content.' },
        { status: 400 }
      );
    }

    fs.writeFileSync(COOKIES_PATH, cookiesContent.trim(), 'utf8');

    // Also copy to /tmp and bin for redundancy
    try {
      fs.writeFileSync(path.join('/tmp', 'cookies.txt'), cookiesContent.trim(), 'utf8');
      const binCookies = path.join(process.cwd(), 'bin', 'cookies.txt');
      if (fs.existsSync(path.dirname(binCookies))) {
        fs.writeFileSync(binCookies, cookiesContent.trim(), 'utf8');
      }
    } catch {}

    const stat = fs.statSync(COOKIES_PATH);
    console.log(`[YouTube Cookies] Successfully saved cookies.txt (${stat.size} bytes)`);

    return NextResponse.json({
      success: true,
      hasCookies: true,
      fileSizeBytes: stat.size,
      message: 'cookies.txt successfully saved on server! YouTube bot protection bypassed.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[YouTube Cookies POST] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
