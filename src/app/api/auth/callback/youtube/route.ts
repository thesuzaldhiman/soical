import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const currentOrigin = `${protocol}://${host}`;

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(error || 'YouTube OAuth was cancelled')}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/accounts?error=no_auth_code_received', request.url));
  }

  let clientId =
    process.env.YOUTUBE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  let clientSecret =
    process.env.YOUTUBE_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET;

  const credsCookie = request.cookies.get('sap_yt_app_creds');
  if (credsCookie?.value) {
    try {
      const parsed = JSON.parse(credsCookie.value);
      if (parsed.clientId) clientId = parsed.clientId;
      if (parsed.clientSecret) clientSecret = parsed.clientSecret;
    } catch {}
  }

  const redirectUri = `${currentOrigin}/api/auth/callback/youtube`;

  if (!clientId || !clientSecret) {
    // If no credentials available to exchange token on server, return code
    return NextResponse.redirect(
      new URL(`/accounts?auth=youtube_code_received&code=${encodeURIComponent(code)}`, request.url)
    );
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        new URL(
          `/accounts?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`,
          request.url
        )
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // 2. Fetch authenticated YouTube Channel via YouTube Data API v3
    let channelInfo = null;

    try {
      const ytRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const ytData = await ytRes.json();

      if (ytData.items && ytData.items.length > 0) {
        const item = ytData.items[0];
        channelInfo = {
          id: item.id,
          name: item.snippet?.title || 'YouTube Channel',
          description: item.snippet?.description || '',
          customUrl: item.snippet?.customUrl || '',
          avatarUrl:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            '/icons/social/youtube.png',
          subscriberCount: parseInt(item.statistics?.subscriberCount || '0', 10),
          videoCount: parseInt(item.statistics?.videoCount || '0', 10),
        };
      }
    } catch (e) {
      console.error('Failed fetching YouTube channel data:', e);
    }

    // 3. Fallback to Google profile if user has no public YouTube channel created yet
    if (!channelInfo) {
      try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userData = await userRes.json();
        channelInfo = {
          id: `yt_${userData.sub || Date.now()}`,
          name: `${userData.name || 'User'} (YouTube Shorts)`,
          description: 'Personal YouTube Account',
          customUrl: '',
          avatarUrl: userData.picture || '/icons/social/youtube.png',
          subscriberCount: 0,
          videoCount: 0,
        };
      } catch {
        channelInfo = {
          id: `yt_${Date.now()}`,
          name: 'Connected YouTube Channel',
          description: 'YouTube Channel Account',
          customUrl: '',
          avatarUrl: '/icons/social/youtube.png',
          subscriberCount: 0,
          videoCount: 0,
        };
      }
    }

    // 4. Set pending import cookie and redirect to /accounts
    const redirectResponse = NextResponse.redirect(
      new URL(
        `/accounts?auth=youtube_success&channel_name=${encodeURIComponent(channelInfo.name)}`,
        request.url
      )
    );

    redirectResponse.cookies.set(
      'sap_pending_yt_import',
      JSON.stringify({
        channel: channelInfo,
        accessToken,
        refreshToken,
      }),
      {
        path: '/',
        maxAge: 3600,
        httpOnly: false,
        sameSite: 'lax',
      }
    );

    return redirectResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed token exchange';
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}
