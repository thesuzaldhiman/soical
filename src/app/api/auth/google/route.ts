import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';



export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  const redirectUrl = new URL(
    `/login?error=${encodeURIComponent('Google login is disabled. Please sign in with your email and password.')}`,
    baseUrl
  );
  const res = NextResponse.redirect(redirectUrl);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}
