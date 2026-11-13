import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId || clientId.trim() === '') {
    return NextResponse.redirect(
      new URL('/login?error=google_client_id_missing', baseUrl)
    );
  }

  const redirectUri = `${baseUrl}/api/auth/callback/google`;
  const scope = encodeURIComponent('openid email profile');
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`;

  return NextResponse.redirect(googleAuthUrl);
}
