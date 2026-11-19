import { NextRequest, NextResponse } from 'next/server';
import { sendAlertEmail } from '@/lib/services/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Kripya ek valid email address enter karein.' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim();

    const result = await sendAlertEmail({
      toEmail: trimmedEmail,
      subject: '⚡ Test Alert: Social Auto Poster Alert System Active',
      title: 'Alert Notification System is Working!',
      message:
        'Aapka Social Auto Poster email alert system safaltapoorvak setup ho chuka hai. Agar aapka YouTube channel, Facebook page ya koi social token disconnect ya expire hota hai, toh aapko isi email par instant notification prapt hogi.',
      platform: 'YouTube & Social Accounts',
      accountName: 'Hostinger Alert System',
      details: {
        'Test Timestamp': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        'Sender Mailbox': 'alerts@khabarmonkey.com',
        'SMTP Server': 'smtp.hostinger.com (Port 465 SSL)',
        'Delivery Status': 'Verified Active',
      },
      isTest: true,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to dispatch test email.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email safaltapoorvak ${trimmedEmail} par send kar di gayi hai!`,
      messageId: result.messageId,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
