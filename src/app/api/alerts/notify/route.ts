import { NextRequest, NextResponse } from 'next/server';
import { sendAlertEmail } from '@/lib/services/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, platform, pageName, reason, pageId } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'No alert email configured.' }, { status: 400 });
    }

    const platName = platform || 'Social Account';
    const targetName = pageName || pageId || 'Connected Channel';

    const result = await sendAlertEmail({
      toEmail: email.trim(),
      subject: `⚠️ Alert: ${platName} Account Disconnected (${targetName})`,
      title: `${platName} Connection Lost`,
      message: `Aapka ${platName} account (${targetName}) disconnect ho gaya hai ya token invalidate ho gaya hai. Auto-posting ke liye kripya ise re-connect karein.`,
      platform: platName,
      accountName: targetName,
      details: {
        'Reason': reason || 'Channel disconnected or Access Token expired',
        'Time': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        'Action Required': 'Settings ya Accounts page par jakar account re-connect karein.',
      },
      isTest: false,
    });

    return NextResponse.json({ success: result.success, error: result.error });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
