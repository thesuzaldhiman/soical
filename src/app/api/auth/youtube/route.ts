import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  const searchParams = request.nextUrl.searchParams;
  const clientId =
    searchParams.get('client_id') ||
    process.env.YOUTUBE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret =
    searchParams.get('client_secret') ||
    process.env.YOUTUBE_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientId.trim()) {
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

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId.trim()
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(
    scopes
  )}&access_type=offline&prompt=consent`;

  const response = NextResponse.redirect(googleAuthUrl);

  if (clientSecret && clientSecret.trim()) {
    response.cookies.set(
      'sap_yt_app_creds',
      JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      {
        path: '/',
        maxAge: 3600,
        sameSite: 'lax',
      }
    );
  }

  return response;
}
