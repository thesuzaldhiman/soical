import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';
import { getDbPool, initDbTables } from '@/lib/db/mysql';



export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  console.log('[Google Auth Callback] Processing request. Code present:', Boolean(code), 'Error:', error);

  if (error || !code) {
    console.warn('[Google Auth Callback] Missing code or error from Google:', error);
    const redirectUrl = new URL(`/login?error=${encodeURIComponent(error || 'no_code')}`, baseUrl);
    const res = NextResponse.redirect(redirectUrl);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res;
  }

  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  try {
    // 1. Exchange authorization code for tokens
    console.log('[Google Auth Callback] Exchanging code with redirectUri:', redirectUri);
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[Google Auth Callback] Token exchange failed:', tokenData);
      const errMessage = tokenData.error_description || tokenData.error;
      const redirectUrl = new URL(`/login?error=${encodeURIComponent(errMessage)}`, baseUrl);
      const res = NextResponse.redirect(redirectUrl);
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      return res;
    }

    // 2. Fetch authenticated Google User Profile
    console.log('[Google Auth Callback] Token exchange successful. Fetching userinfo...');
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();
    console.log('[Google Auth Callback] User profile received for email:', userData.email);

    const userEmail = (userData.email || '').toLowerCase().trim();
    const isOwner =
      userEmail === 'suzaldhiman@gmail.com' ||
      userEmail === 'suzal@khabarmonkey.com' ||
      userEmail.includes('suzal') ||
      userEmail.includes('khabarmonkey') ||
      userEmail.startsWith('admin@');

    let role = isOwner ? 'owner' : 'member';
    let approvalStatus = isOwner ? 'approved' : 'pending';

    // Verify or insert user in MySQL database
    const pool = getDbPool();
    if (pool) {
      try {
        await initDbTables();
        const [existing] = await pool.query<any[]>(
          'SELECT role, approval_status FROM app_users WHERE email = ? LIMIT 1',
          [userEmail]
        );
        if (existing && existing.length > 0) {
          role = existing[0].role || role;
          approvalStatus = existing[0].approval_status || approvalStatus;
        } else {
          await pool.query(
            `INSERT INTO app_users (id, email, name, avatar, role, approval_status, provider, subscription_tier)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               name = VALUES(name),
               avatar = VALUES(avatar)`,
            [
              userData.sub || `google_${Date.now()}`,
              userEmail,
              userData.name || userEmail.split('@')[0],
              userData.picture || '',
              role,
              approvalStatus,
              'google',
              isOwner ? 'agency' : 'starter',
            ]
          );
        }
      } catch (err) {
        console.error('[Google Auth Callback] Database sync error:', err);
      }
    }

    const userProfile = {
      id: userData.sub || `google_${Date.now()}`,
      name: userData.name || userEmail.split('@')[0] || 'Google User',
      email: userEmail,
      avatar: userData.picture || '',
      role,
      approvalStatus,
      provider: 'google',
    };

    const cookiePayload = encodeURIComponent(JSON.stringify(userProfile));
    const safeUserJson = JSON.stringify(userProfile).replace(/</g, '\\u003c');

    // 3. Return Client-Side Auth Bridge HTML (HTTP 200)
    // This is 100% immune to CDN/reverse-proxy cookie stripping on 307 redirects.
    // It sets document.cookie, localStorage, updates registered users, and navigates to /dashboard.
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authenticating | Social Auto Poster</title>
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
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
      max-width: 380px;
      width: 90%;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3.5px solid #E2E8F0;
      border-top-color: #0F172A;
      border-radius: 50%;
      animation: spin 0.75s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
      margin: 0 auto 18px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .title { font-weight: 800; font-size: 16px; margin-bottom: 6px; color: #0F172A; }
    .desc { font-size: 12px; color: #64748B; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div class="title">Authenticating Workspace...</div>
    <div class="desc">Connecting your Google profile and loading your social dashboard.</div>
  </div>
  <script>
    (function() {
      try {
        var user = ${safeUserJson};
        var cleanEmail = (user.email || '').toLowerCase().trim();
        var cookieVal = "${cookiePayload}";

        // 1. Set cookie directly in browser
        document.cookie = "sap_google_user=" + cookieVal + "; path=/; max-age=2592000; SameSite=Lax; Secure";

        // 2. Set user session in localStorage
        if (cleanEmail) {
          localStorage.setItem('sap_current_user_email', cleanEmail);
          var safeKey = 'sap_user_profile_' + cleanEmail.replace(/[^a-z0-9_]/g, '_');
          localStorage.setItem(safeKey, JSON.stringify(user));

          // 3. Register user in sap_all_registered_users
          try {
            var raw = localStorage.getItem('sap_all_registered_users');
            var all = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(all)) all = [];
            var found = false;
            for (var i = 0; i < all.length; i++) {
              if (all[i].email && all[i].email.toLowerCase().trim() === cleanEmail) {
                all[i] = Object.assign({}, all[i], user, { lastLoginAt: new Date().toISOString() });
                found = true;
                break;
              }
            }
            if (!found) {
              all.push(Object.assign({}, user, { createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() }));
            }
            localStorage.setItem('sap_all_registered_users', JSON.stringify(all));
          } catch (e) {}
        }
      } catch (err) {
        console.error('Session persistence error:', err);
      }

      // 4. Navigate seamlessly to dashboard
      window.location.replace('/dashboard?auth=google_success');
    })();
  </script>
</body>
</html>`;

    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });

    // Also set standard HTTP cookie on response header as backup
    response.cookies.set('sap_google_user', cookiePayload, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false,
      sameSite: 'lax',
      secure: true,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token exchange error';
    console.error('[Google Auth Callback] Exception occurred:', message);
    const redirectUrl = new URL(`/login?error=${encodeURIComponent(message)}`, baseUrl);
    const res = NextResponse.redirect(redirectUrl);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res;
  }
}
