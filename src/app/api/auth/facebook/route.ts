import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';
import { getDbPool } from '@/lib/db/mysql';
import { MetaAppConfig } from '@/types';

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

  let metaAppConfigId = (searchParams.get('app_config_id') || '').trim();
  let metaAppName = (searchParams.get('app_name') || '').trim();

  // If user is logged in, read settings from MySQL to resolve Meta App
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

            const metaApps: MetaAppConfig[] = Array.isArray(userSettings?.metaApps) ? userSettings.metaApps : [];

            // 1. If metaAppConfigId provided, match by id or appId
            if (metaAppConfigId && metaApps.length > 0) {
              const matched = metaApps.find((a) => a.id === metaAppConfigId || a.appId === metaAppConfigId);
              if (matched) {
                appId = matched.appId.trim();
                appSecret = matched.appSecret.trim();
                metaAppConfigId = matched.id;
                metaAppName = matched.name;
              }
            } else if (appId && metaApps.length > 0) {
              // 2. If appId provided, match against metaApps to populate secret/name
              const matched = metaApps.find((a) => a.appId.trim() === appId.trim());
              if (matched) {
                if (!appSecret) appSecret = matched.appSecret.trim();
                if (!metaAppConfigId) metaAppConfigId = matched.id;
                if (!metaAppName) metaAppName = matched.name;
              }
            } else if (!appId && metaApps.length > 0) {
              // 3. Pick default or first app from metaApps
              const defaultApp = metaApps.find((a) => a.isDefault) || metaApps[0];
              if (defaultApp) {
                appId = defaultApp.appId.trim();
                appSecret = defaultApp.appSecret.trim();
                metaAppConfigId = defaultApp.id;
                metaAppName = defaultApp.name;
              }
            }

            // Fallback to legacy single metaAppId / metaAppSecret
            if (!appId && userSettings?.metaAppId) appId = userSettings.metaAppId.trim();
            if (!appSecret && userSettings?.metaAppSecret) appSecret = userSettings.metaAppSecret.trim();
            if (!metaAppName && appId) metaAppName = 'Primary Meta App';
          }
        }
      }
    } catch (err) {
      console.warn('[Facebook Auth Init] Failed reading user settings from DB:', err);
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
    metaAppConfigId: metaAppConfigId || appId.trim(),
    metaAppName: metaAppName || 'Meta App',
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
      encodeURIComponent(JSON.stringify({
        appId: appId.trim(),
        appSecret: appSecret.trim(),
        metaAppConfigId: metaAppConfigId || appId.trim(),
        metaAppName: metaAppName || 'Meta App',
      })),
      {
        path: '/',
        maxAge: 3600,
        sameSite: 'lax',
      }
    );
  }

  return response;
}
