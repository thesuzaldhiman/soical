import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const currentOrigin = `${protocol}://${host}`;

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/accounts?error=${encodeURIComponent(
          errorDescription || error || 'Facebook authentication was cancelled'
        )}`,
        request.url
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/accounts?error=no_auth_code_received', request.url));
  }

  // Check for app credentials in cookies or env
  let appId = process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  let appSecret = process.env.FACEBOOK_APP_SECRET;

  const credsCookie = request.cookies.get('sap_fb_app_creds');
  if (credsCookie?.value) {
    try {
      const parsed = JSON.parse(credsCookie.value);
      if (parsed.appId) appId = parsed.appId;
      if (parsed.appSecret) appSecret = parsed.appSecret;
    } catch {}
  }

  const redirectUri = `${currentOrigin}/api/auth/callback/facebook`;

  if (appId && appSecret) {
    try {
      // 1. Exchange code for User Access Token
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${encodeURIComponent(
        appId
      )}&client_secret=${encodeURIComponent(
        appSecret
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`;

      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (tokenData.access_token) {
        const userToken = tokenData.access_token;

        // 2. Fetch User's Pages via /me/accounts
        const accountsRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,fan_count,picture.type(large),access_token,tasks&access_token=${userToken}`
        );
        const accountsData = await accountsRes.json();
        const pages = accountsData.data || [];

        const redirectResponse = NextResponse.redirect(
          new URL(
            `/accounts?auth=facebook_success&pages_found=${pages.length}`,
            request.url
          )
        );

        // Put pages in cookie so client can hydrate them into state
        redirectResponse.cookies.set(
          'sap_pending_fb_import',
          JSON.stringify({
            userToken,
            pages: pages.map((p: any) => ({
              id: p.id,
              name: p.name,
              fanCount: p.fan_count || 0,
              avatarUrl: p.picture?.data?.url || '',
              accessToken: p.access_token,
            })),
          }),
          {
            path: '/',
            maxAge: 3600,
            httpOnly: false,
          }
        );

        return redirectResponse;
      }
    } catch (e) {
      console.error('Error exchanging Facebook OAuth token:', e);
    }
  }

  // Fallback: redirect to accounts with the code so client can complete
  return NextResponse.redirect(
    new URL(`/accounts?auth=facebook_code_received&code=${encodeURIComponent(code)}`, request.url)
  );
}
