import nodemailer from 'nodemailer';

interface SendResetEmailParams {
  toEmail: string;
  resetUrl: string;
  recipientName?: string;
}

export async function sendPasswordResetEmail({
  toEmail,
  resetUrl,
  recipientName = 'User',
}: SendResetEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom =
    process.env.SMTP_FROM || `"Social Auto Poster" <${smtpUser || 'noreply@khabarmonkey.com'}>`;

  // HTML Email Template
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 15px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                  <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background-color: #0F172A; border-radius: 12px; color: #FFFFFF; font-size: 20px; font-weight: bold;">
                    ⚡
                  </div>
                  <h2 style="margin: 16px 0 0 0; font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px;">
                    Social Auto Poster
                  </h2>
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B;">Workspace Security &amp; Access</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h3 style="margin: 0 0 12px 0; font-size: 17px; font-weight: 700; color: #0F172A;">
                    Password Reset Request
                  </h3>
                  <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                    Namaste <strong>${recipientName}</strong>,
                  </p>
                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                    Aapke Social Auto Poster account ke liye password reset ki request aayi hai. Niche diye button par click karke aap apna naya password set kar sakte hain:
                  </p>
                  <div style="text-align: center; margin: 28px 0;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 13px 28px; background-color: #0F172A; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; letter-spacing: 0.2px;">
                      Reset Password
                    </a>
                  </div>
                  <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.6; color: #64748B;">
                    Ye link agle <strong>60 minutes (1 ghanta)</strong> tak valid hai. Agar aapne ye request nahi ki thi, to aap is email ko ignore kar sakte hain, aapka password safe rahega.
                  </p>
                  <div style="margin-top: 24px; padding: 12px; background-color: #F8F9FA; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 11px; word-break: break-all; color: #64748B;">
                    Agar button kaam na kare to ye URL browser me open karein:<br/>
                    <a href="${resetUrl}" style="color: #2563EB;">${resetUrl}</a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 32px; background-color: #F8F9FA; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #F1F5F9;">
                  &copy; 2026 Social Auto Poster • game.khabarmonkey.com
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // If no SMTP credentials configured, log reset URL and return simulated success
  if (!smtpUser || !smtpPass) {
    console.warn('[Mailer] SMTP credentials not set in environment. Reset Link generated:');
    console.warn(`[Mailer] Reset URL for ${toEmail}: ${resetUrl}`);
    return {
      success: true,
      messageId: `simulated_${Date.now()}`,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: 'Reset Your Password - Social Auto Poster',
      text: `Namaste ${recipientName},\n\nAapke account ke liye password reset request aayi hai. Is link par click karke naya password set karein:\n${resetUrl}\n\nYe link 1 ghante tak valid hai.`,
      html: htmlContent,
    });

    console.log('[Mailer] Password reset email sent successfully to:', toEmail, 'MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown mailer error';
    console.error('[Mailer] Failed to send email via SMTP:', errorMsg);
    console.warn(`[Mailer Fallback] Reset URL for ${toEmail}: ${resetUrl}`);
    return { success: false, error: errorMsg };
  }
}

