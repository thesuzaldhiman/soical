import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const currentOrigin = `${protocol}://${host}`;

  const searchParams = request.nextUrl.searchParams;
  const appId =
    searchParams.get('app_id') ||
    process.env.FACEBOOK_APP_ID ||
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appSecret =
    searchParams.get('app_secret') ||
    process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appId.trim()) {
    return NextResponse.redirect(
      new URL('/settings?error=facebook_app_id_missing', request.url)
    );
  }

  const redirectUri = `${currentOrigin}/api/auth/callback/facebook`;
  const scope = [
    'public_profile',
    'pages_manage_posts',
    'pages_read_engagement',
    'pages_show_list',
    'pages_manage_metadata',
    'read_insights',
  ].join(',');

  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(
    appId.trim()
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scope)}&response_type=code`;

  const response = NextResponse.redirect(fbAuthUrl);

  if (appSecret && appSecret.trim()) {
    response.cookies.set(
      'sap_fb_app_creds',
      JSON.stringify({ appId: appId.trim(), appSecret: appSecret.trim() }),
      {
        path: '/',
        maxAge: 3600,
        sameSite: 'lax',
      }
    );
  }

  return response;
}
