import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

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
        baseUrl
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/accounts?error=no_auth_code_received', baseUrl));
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

  const redirectUri = `${baseUrl}/api/auth/callback/facebook`;

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
        // 2. Fetch User Profile & Pages
        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(
          tokenData.access_token
        )}&fields=id,name,access_token,category,tasks,picture{url}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        const userUrl = `https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(
          tokenData.access_token
        )}&fields=id,name,picture{url}`;
        const userRes = await fetch(userUrl);
        const userData = await userRes.json();

        // 3. Set Cookie with payload and redirect to /accounts
        const payload = {
          user: userData,
          userAccessToken: tokenData.access_token,
          pages: pagesData.data || [],
        };

        const redirectResponse = NextResponse.redirect(
          new URL('/accounts?auth=facebook_success', baseUrl)
        );

        redirectResponse.cookies.set(
          'sap_pending_fb_import',
          JSON.stringify(payload),
          {
            path: '/',
            maxAge: 3600,
            httpOnly: false,
            sameSite: 'lax',
          }
        );

        return redirectResponse;
      } else {
        const errorMsg = tokenData.error?.message || 'Token exchange failed';
        return NextResponse.redirect(
          new URL(`/accounts?error=${encodeURIComponent(errorMsg)}`, baseUrl)
        );
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown OAuth error';
      return NextResponse.redirect(
        new URL(`/accounts?error=${encodeURIComponent(message)}`, baseUrl)
      );
    }
  }

  // Fallback if client-side exchange is preferred
  return NextResponse.redirect(
    new URL(`/accounts?auth=facebook_code_received&code=${encodeURIComponent(code)}`, baseUrl)
  );
}
