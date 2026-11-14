import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, initDbTables } from '@/lib/db/mysql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email: rawEmail, password } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing reset token.' },
        { status: 400 }
      );
    }

    if (!rawEmail || !rawEmail.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password kam se kam 6 characters ka hona chahiye.' },
        { status: 400 }
      );
    }

    const email = rawEmail.toLowerCase().trim();
    const pool = getDbPool();

    if (!pool) {
      return NextResponse.json(
        { success: false, message: 'Database connection offline. Please try again later.' },
        { status: 503 }
      );
    }

    await initDbTables();

    // 1. Verify token validity and expiration
    const [tokenRows] = await pool.query<any[]>(
      'SELECT id, expires_at, used FROM app_password_resets WHERE token = ? AND LOWER(email) = LOWER(?) LIMIT 1',
      [token, email]
    );

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid reset token. Kripya naya password reset link request karein.',
        },
        { status: 400 }
      );
    }

    const resetRecord = tokenRows[0];

    if (resetRecord.used === 1) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ye reset link pehle hi use ho chuka hai. Kripya naya link request karein.',
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(resetRecord.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ye reset link expire ho chuka hai (1 ghante ki validity samapt). Kripya naya link request karein.',
        },
        { status: 400 }
      );
    }

    // 2. Update user's password in app_users
    await pool.query(
      'UPDATE app_users SET password = ?, updated_at = NOW() WHERE LOWER(email) = LOWER(?)',
      [password, email]
    );

    // 3. Mark token as used
    await pool.query('UPDATE app_password_resets SET used = 1 WHERE token = ?', [token]);

    return NextResponse.json({
      success: true,
      message: 'Password successfully update ho gaya hai! Aap ab naye password se login kar sakte hain.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Reset Password API] Error:', errorMsg);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + errorMsg },
      { status: 500 }
    );
  }
}
