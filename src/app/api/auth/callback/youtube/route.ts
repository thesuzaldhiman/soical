import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/accounts?error=youtube_oauth_failed', request.url));
  }

  // In production, exchange code with oauth2.googleapis.com/token for refresh_token + access_token
  return NextResponse.redirect(new URL('/accounts?success=youtube_connected', request.url));
}
