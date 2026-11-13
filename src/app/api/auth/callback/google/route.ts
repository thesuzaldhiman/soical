import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error || 'no_code')}`, baseUrl)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId || '',
        client_secret: clientSecret || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`,
          baseUrl
        )
      );
    }

    // 2. Fetch authenticated Google User Profile
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();

    const userProfile = {
      id: userData.sub || `google_${Date.now()}`,
      name: userData.name || userData.email?.split('@')[0] || 'Google User',
      email: userData.email,
      avatar: userData.picture || '',
      role: 'owner',
      provider: 'google',
    };

    // 3. Set Session Cookie & Redirect to Dashboard using public baseUrl
    const response = NextResponse.redirect(
      new URL('/dashboard?auth=google_success', baseUrl)
    );

    // Save as URL-encoded JSON string so client cookie parser reads it cleanly
    response.cookies.set('sap_google_user', encodeURIComponent(JSON.stringify(userProfile)), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false, // Accessible to client-side hydration
      sameSite: 'lax',
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token exchange error';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, baseUrl)
    );
  }
}
