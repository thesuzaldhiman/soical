import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(error || 'YouTube OAuth was cancelled')}`, baseUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/accounts?error=no_auth_code_received', baseUrl));
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

  const redirectUri = `${baseUrl}/api/auth/callback/youtube`;

  if (!clientId || !clientSecret) {
    // If no credentials available to exchange token on server, return code
    return NextResponse.redirect(
      new URL(`/accounts?auth=youtube_code_received&code=${encodeURIComponent(code)}`, baseUrl)
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
          baseUrl
        )
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || '';

    // 2. Fetch the YouTube Channel details
    let channelInfo: {
      id: string;
      name: string;
      description?: string;
      customUrl?: string;
      avatarUrl?: string;
      subscriberCount?: number;
      videoCount?: number;
    } | null = null;

    try {
      const channelRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const channelData = await channelRes.json();

      if (channelData.items && channelData.items.length > 0) {
        const item = channelData.items[0];
        channelInfo = {
          id: item.id,
          name: item.snippet?.title || 'YouTube Channel',
          description: item.snippet?.description || '',
          customUrl: item.snippet?.customUrl || '',
          avatarUrl:
            item.snippet?.thumbnails?.default?.url ||
            item.snippet?.thumbnails?.high?.url ||
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

    // 4. Return Client-Side Auth Bridge HTML (HTTP 200)
    // Immune to cookie character/size limits
    const payload = {
      channel: channelInfo,
      accessToken,
      refreshToken,
      importedAt: new Date().toISOString(),
    };
    const safePayloadJson = JSON.stringify(payload).replace(/</g, '\\u003c');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>YouTube Connected | Social Auto Poster</title>
  <style>
    * { box-sizing: border-box; }
    body {
      background-color: #F8F9FA;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      color: #0F172A;
    }
    .card {
      background: #FFFFFF;
      padding: 36px 32px;
      border-radius: 24px;
      border: 1px solid #E2E8F0;
      text-align: center;
      max-width: 440px;
      width: 90%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: #FF0000;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px auto;
      color: white;
    }
    h1 {
      font-size: 19px;
      font-weight: 700;
      margin: 0 0 8px 0;
      letter-spacing: -0.02em;
    }
    p {
      font-size: 13px;
      color: #64748B;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #E2E8F0;
      border-top-color: #FF0000;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    </div>
    <h1>YouTube Connected!</h1>
    <p id="status-text">Connecting channel "${channelInfo.name.replace(/"/g, '')}"...</p>
    <div class="spinner"></div>
  </div>

  <script>
    (function() {
      try {
        var payload = ${safePayloadJson};
        try {
          localStorage.setItem('sap_pending_yt_import', JSON.stringify(payload));
        } catch(e) {}
        try {
          sessionStorage.setItem('sap_pending_yt_import', JSON.stringify(payload));
        } catch(e) {}

        setTimeout(function() {
          window.location.replace('/accounts?auth=youtube_success&channel_name=' + encodeURIComponent(payload.channel.name || 'YouTube'));
        }, 500);
      } catch (err) {
        console.error('YouTube Bridge Error:', err);
        window.location.replace('/accounts?error=' + encodeURIComponent(err.message || 'Import error'));
      }
    })();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed token exchange';
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(msg)}`, baseUrl)
    );
  }
}
