import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';
import { getDbPool } from '@/lib/db/mysql';
import { SocialAccount, SocialPage } from '@/types';

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

  // 1. Recover credentials from state payload first (immune to cookie issues)
  const stateRaw = searchParams.get('state');
  let stateData: any = null;
  if (stateRaw) {
    try {
      stateData = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
    } catch {
      try {
        stateData = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf8'));
      } catch {}
    }
  }

  let clientId = (
    stateData?.clientId ||
    process.env.YOUTUBE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
  ).trim();

  let clientSecret = (
    stateData?.clientSecret ||
    process.env.YOUTUBE_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET || ''
  ).trim();

  let loggedInEmail = (stateData?.email || '').toLowerCase().trim();

  // 2. Check cookies as fallback
  if (!loggedInEmail) {
    const userCookie =
      request.cookies.get('sap_user_session')?.value ||
      request.cookies.get('sap_google_user')?.value;
    if (userCookie) {
      try {
        let decoded = userCookie;
        try {
          decoded = decodeURIComponent(userCookie);
        } catch {}
        const parsed = JSON.parse(decoded);
        loggedInEmail = (parsed.email || '').toLowerCase().trim();
      } catch {}
    }
  }

  const credsCookie = request.cookies.get('sap_yt_app_creds');
  if (credsCookie?.value) {
    try {
      const parsed = JSON.parse(credsCookie.value);
      if (!clientId && parsed.clientId) clientId = parsed.clientId;
      if (!clientSecret && parsed.clientSecret) clientSecret = parsed.clientSecret;
    } catch {}
  }

  // 3. Fallback to MySQL user settings lookup if credentials still missing
  if ((!clientId || !clientSecret) && loggedInEmail) {
    try {
      const pool = getDbPool();
      if (pool) {
        const [rows] = await pool.query<any[]>(
          'SELECT settings FROM app_user_data WHERE email = ? LIMIT 1',
          [loggedInEmail]
        );
        if (rows && rows.length > 0 && rows[0].settings) {
          const userSettings =
            typeof rows[0].settings === 'string'
              ? JSON.parse(rows[0].settings)
              : rows[0].settings;
          if (!clientId && userSettings?.ytClientId) clientId = userSettings.ytClientId.trim();
          if (!clientSecret && userSettings?.ytClientSecret) clientSecret = userSettings.ytClientSecret.trim();
        }
      }
    } catch (dbErr) {
      console.warn('[YouTube Callback] MySQL settings lookup warning:', dbErr);
    }
  }

  const redirectUri = `${baseUrl}/api/auth/callback/youtube`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/accounts?error=' + encodeURIComponent('Missing YouTube Client ID or Client Secret. Please configure in Settings first.'), baseUrl)
    );
  }

  try {
    // 4. Exchange authorization code for tokens
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

    // 5. Fetch YouTube Channel details
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
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            '/icons/social/youtube.png',
          subscriberCount: parseInt(item.statistics?.subscriberCount || '0', 10),
          videoCount: parseInt(item.statistics?.videoCount || '0', 10),
        };
      } else {
        // Try managedByMe=true for brand channels
        const managedRes = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&managedByMe=true',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const managedData = await managedRes.json();
        if (managedData.items && managedData.items.length > 0) {
          const item = managedData.items[0];
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
      }
    } catch (e) {
      console.error('Failed fetching YouTube channel data:', e);
    }

    // 6. Fallback to Google profile if user has no public YouTube channel created yet
    if (!channelInfo) {
      try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userData = await userRes.json();
        channelInfo = {
          id: `yt_${userData.sub || Date.now()}`,
          name: `${userData.name || 'User'} (YouTube Shorts)`,
          description: 'Personal YouTube Channel Account',
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

    // 7. DIRECT AUTHORITATIVE CLOUD PERSISTENCE: Save to MySQL immediately
    if (loggedInEmail) {
      try {
        const pool = getDbPool();
        if (pool) {
          const [rows] = await pool.query<any[]>(
            'SELECT accounts, pages FROM app_user_data WHERE email = ? LIMIT 1',
            [loggedInEmail]
          );

          let currentAccounts: SocialAccount[] = [];
          let currentPages: SocialPage[] = [];

          if (rows && rows.length > 0) {
            try {
              currentAccounts =
                typeof rows[0].accounts === 'string'
                  ? JSON.parse(rows[0].accounts)
                  : rows[0].accounts || [];
            } catch {}
            try {
              currentPages =
                typeof rows[0].pages === 'string'
                  ? JSON.parse(rows[0].pages)
                  : rows[0].pages || [];
            } catch {}
          }

          // Build or update Account
          const newAccountId = `acc_youtube_${Date.now()}`;
          const existingAccIdx = currentAccounts.findIndex(
            (a) =>
              a.platform === 'youtube' &&
              (a.accountId === channelInfo!.id || a.name?.toLowerCase().includes(channelInfo!.name.toLowerCase()))
          );

          const ytAccount: SocialAccount = {
            id: existingAccIdx >= 0 ? currentAccounts[existingAccIdx]!.id : newAccountId,
            platform: 'youtube',
            accountId: channelInfo.id,
            name: `${channelInfo.name} (YouTube Account)`,
            avatarUrl: channelInfo.avatarUrl || '/icons/social/youtube.png',
            status: 'active',
            accessToken,
            refreshToken: refreshToken || (existingAccIdx >= 0 ? currentAccounts[existingAccIdx]!.refreshToken : ''),
            tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
            lastCheckedAt: new Date().toISOString(),
          };

          const updatedAccounts =
            existingAccIdx >= 0
              ? currentAccounts.map((a, idx) => (idx === existingAccIdx ? ytAccount : a))
              : [ytAccount, ...currentAccounts];

          // Build or update Page
          const existingPageIdx = currentPages.findIndex(
            (p) =>
              p.platform === 'youtube' &&
              (p.pageId === channelInfo!.id || p.name?.toLowerCase() === channelInfo!.name.toLowerCase())
          );

          const targetUrl = channelInfo.customUrl
            ? `https://youtube.com/${channelInfo.customUrl.startsWith('@') ? channelInfo.customUrl : '@' + channelInfo.customUrl}`
            : channelInfo.id.startsWith('UC')
            ? `https://youtube.com/channel/${channelInfo.id}`
            : `https://youtube.com`;

          const ytPage: SocialPage = {
            id: existingPageIdx >= 0 ? currentPages[existingPageIdx]!.id : `pg_yt_${Date.now()}`,
            accountId: ytAccount.id,
            platform: 'youtube',
            pageId: channelInfo.id,
            name: channelInfo.name,
            avatarUrl: channelInfo.avatarUrl || '/icons/social/youtube.png',
            fanCount: channelInfo.subscriberCount || 0,
            isActive: true,
            accessToken,
            targetUrl,
            category: 'YouTube Shorts',
            permissions: ['youtube.upload', 'youtube.readonly'],
            lastCheckedAt: new Date().toISOString(),
          };

          const updatedPages =
            existingPageIdx >= 0
              ? currentPages.map((p, idx) => (idx === existingPageIdx ? ytPage : p))
              : [...currentPages, ytPage];

          await pool.query(
            'UPDATE app_user_data SET accounts = ?, pages = ?, updated_at = NOW() WHERE email = ?',
            [JSON.stringify(updatedAccounts), JSON.stringify(updatedPages), loggedInEmail]
          );
          console.log(`[YouTube OAuth] Successfully synced channel "${channelInfo.name}" directly to MySQL for ${loggedInEmail}`);
        }
      } catch (dbErr) {
        console.warn('[YouTube OAuth] Background DB sync note:', dbErr);
      }
    }

    // 8. Return Client-Side Auth Bridge HTML (HTTP 200)
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
