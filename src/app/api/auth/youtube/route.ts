import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';
import { getDbPool } from '@/lib/db/mysql';

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  const searchParams = request.nextUrl.searchParams;
  let clientId = (
    searchParams.get('client_id') ||
    process.env.YOUTUBE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
  ).trim();

  let clientSecret = (
    searchParams.get('client_secret') ||
    process.env.YOUTUBE_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET || ''
  ).trim();

  // If user is logged in, resolve YouTube Client credentials from MySQL if not provided
  const userCookie =
    request.cookies.get('sap_user_session')?.value ||
    request.cookies.get('sap_google_user')?.value;
  let loggedInEmail = '';

  if (userCookie) {
    try {
      let decoded = userCookie;
      try {
        decoded = decodeURIComponent(userCookie);
      } catch {}
      const parsed = JSON.parse(decoded);
      loggedInEmail = (parsed.email || '').toLowerCase().trim();

      if (loggedInEmail && (!clientId || !clientSecret)) {
        const pool = getDbPool();
        if (pool) {
          const [rows] = await pool.query<any[]>(
            'SELECT settings FROM app_user_data WHERE email = ? LIMIT 1',
            [loggedInEmail]
          );
          if (rows && rows.length > 0 && rows[0].settings) {
            const userSettings =
              typeof rows[0].settings === 'string'
                ? JSON.parse(rows[0].settings)
                : rows[0].settings;

            if (!clientId && userSettings?.ytClientId) {
              clientId = userSettings.ytClientId.trim();
            }
            if (!clientSecret && userSettings?.ytClientSecret) {
              clientSecret = userSettings.ytClientSecret.trim();
            }
          }
        }
      }
    } catch (err) {
      console.warn('[YouTube Auth Init] DB settings lookup warning:', err);
    }
  }

  if (!clientId) {
    return NextResponse.redirect(
      new URL('/settings?error=youtube_client_id_missing', baseUrl)
    );
  }

  const redirectUri = `${baseUrl}/api/auth/callback/youtube`;
  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  // Pack state safely (immune to cookie dropping and cross-site stripping)
  const statePayload = {
    clientId: clientId.trim(),
    clientSecret: clientSecret ? clientSecret.trim() : '',
    email: loggedInEmail,
    t: Date.now(),
  };
  const stateParam = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId.trim()
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(
    scopes
  )}&access_type=offline&prompt=consent&state=${encodeURIComponent(stateParam)}`;

  const response = NextResponse.redirect(googleAuthUrl);

  if (clientSecret && clientSecret.trim()) {
    response.cookies.set(
      'sap_yt_app_creds',
      JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      {
        path: '/',
        maxAge: 3600,
        sameSite: 'lax',
        secure: true,
      }
    );
  }

  return response;
}
