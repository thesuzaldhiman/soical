import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';
import { getDbPool } from '@/lib/db/mysql';

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  const searchParams = request.nextUrl.searchParams;
  let appId = (
    searchParams.get('app_id') ||
    process.env.FACEBOOK_APP_ID ||
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || ''
  ).trim();

  let appSecret = (
    searchParams.get('app_secret') ||
    process.env.FACEBOOK_APP_SECRET || ''
  ).trim();

  // If missing from query or env, check MySQL settings for logged in user
  if (!appId || !appSecret) {
    const userCookie = request.cookies.get('sap_google_user')?.value;
    if (userCookie) {
      try {
        let decoded = userCookie;
        try { decoded = decodeURIComponent(userCookie); } catch {}
        const parsed = JSON.parse(decoded);
        const email = (parsed.email || '').toLowerCase().trim();
        if (email) {
          const pool = getDbPool();
          if (pool) {
            const [rows] = await pool.query<any[]>(
              'SELECT settings FROM app_user_data WHERE email = ? LIMIT 1',
              [email]
            );
            if (rows && rows.length > 0 && rows[0].settings) {
              const userSettings = typeof rows[0].settings === 'string'
                ? JSON.parse(rows[0].settings)
                : rows[0].settings;
              if (!appId && userSettings?.metaAppId) appId = userSettings.metaAppId.trim();
              if (!appSecret && userSettings?.metaAppSecret) appSecret = userSettings.metaAppSecret.trim();
            }
          }
        }
      } catch (err) {
        console.warn('[Facebook Auth Init] Failed reading user settings from DB:', err);
      }
    }
  }

  if (!appId) {
    return NextResponse.redirect(
      new URL('/settings?error=facebook_app_id_missing', baseUrl)
    );
  }

  const redirectUri = `${baseUrl}/api/auth/callback/facebook`;
  const scope = [
    'public_profile',
    'pages_manage_posts',
    'pages_read_engagement',
    'pages_show_list',
    'pages_manage_metadata',
    'read_insights',
  ].join(',');

  // Pack state safely (immune to cookie issues and cross-site stripping)
  const statePayload = {
    appId: appId.trim(),
    appSecret: appSecret ? appSecret.trim() : '',
    t: Date.now(),
  };
  const stateParam = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(
    appId.trim()
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scope)}&response_type=code&state=${encodeURIComponent(stateParam)}`;

  const response = NextResponse.redirect(fbAuthUrl);

  // Set lightweight URL-encoded cookie as fallback
  if (appSecret) {
    response.cookies.set(
      'sap_fb_app_creds',
      encodeURIComponent(JSON.stringify({ appId: appId.trim(), appSecret: appSecret.trim() })),
      {
        path: '/',
        maxAge: 3600,
        sameSite: 'lax',
      }
    );
  }

  return response;
}
