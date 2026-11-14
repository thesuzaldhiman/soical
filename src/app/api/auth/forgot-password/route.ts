import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { sendPasswordResetEmail } from '@/lib/services/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email: rawEmail } = body;

    if (!rawEmail || !rawEmail.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Kripya ek valid email address enter karein.' },
        { status: 400 }
      );
    }

    const email = rawEmail.toLowerCase().trim();
    const pool = getDbPool();

    if (!pool) {
      return NextResponse.json(
        { success: false, message: 'Database connection offline. Please try again.' },
        { status: 503 }
      );
    }

    await initDbTables();

    // 1. Verify user exists in app_users
    const [users] = await pool.query<any[]>(
      'SELECT id, name, email FROM app_users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Is email address se koi account registered nahi mila. Kripya pehle register karein.',
        },
        { status: 404 }
      );
    }

    const targetUser = users[0];

    // 2. Generate secure token & expiry (1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any previous unused tokens for this email
    await pool.query(
      'UPDATE app_password_resets SET used = 1 WHERE LOWER(email) = LOWER(?) AND used = 0',
      [email]
    );

    // 3. Save reset token in DB
    await pool.query(
      'INSERT INTO app_password_resets (email, token, expires_at, used) VALUES (?, ?, ?, 0)',
      [email, token, expiresAt]
    );

    // 4. Construct reset link
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (request.headers.get('host')
        ? `https://${request.headers.get('host')}`
        : 'https://game.khabarmonkey.com');

    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // 5. Send Email via Mailer service
    const mailResult = await sendPasswordResetEmail({
      toEmail: email,
      resetUrl,
      recipientName: targetUser.name || email.split('@')[0],
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset link aapke email par bhej diya gaya hai. Kripya apna inbox check karein.',
      // Only include debug resetUrl if SMTP is not active or in dev mode
      resetUrl: !process.env.SMTP_USER ? resetUrl : undefined,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Forgot Password API] Error:', errorMsg);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + errorMsg },
      { status: 500 }
    );
  }
}

