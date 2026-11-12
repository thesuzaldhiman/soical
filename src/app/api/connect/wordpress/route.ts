import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      siteUrl,
      connectionMode = 'auto-engine',
      bridgeKey,
      username,
      appPassword,
    } = body;

    if (!siteUrl || typeof siteUrl !== 'string') {
      return NextResponse.json(
        { verified: false, error: 'Please enter a valid WordPress Site URL.' },
        { status: 400 }
      );
    }

    // Clean & normalize site URL
    let normalizedUrl = siteUrl.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // MODE 1: AUTO ENGINE BRIDGE API
    if (connectionMode === 'auto-engine') {
      if (!bridgeKey || typeof bridgeKey !== 'string') {
        return NextResponse.json(
          {
            verified: false,
            error: 'Missing Bridge Secret Key. Copy it from your WordPress Admin > Auto Engine > Settings > Social Auto Poster Bridge.',
          },
          { status: 400 }
        );
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const targetEndpoint = `${normalizedUrl}/wp-json/auto-engine/v1/status`;
        const res = await fetch(targetEndpoint, {
          method: 'GET',
          headers: {
            'X-AE-Key': bridgeKey.trim(),
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.status === 401 || res.status === 403) {
          return NextResponse.json({
            verified: false,
            error: 'Authentication failed. Invalid Bridge Secret Key. Please verify the key in Auto Engine settings.',
          });
        }

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            verified: true,
            siteName: data.site_name || new URL(normalizedUrl).hostname,
            siteUrl: normalizedUrl,
            pluginVersion: data.plugin_version || '7.5.0',
            bridgeVersion: data.bridge_version || '1.0',
            categories: data.categories || [],
            features: data.features || { watermark: true, seo: true },
            message: 'Connected successfully via Auto Engine Bridge!',
          });
        }

        // If endpoint 404, check if base site is alive
        const pingBase = await fetch(normalizedUrl, { method: 'HEAD' }).catch(() => null);
        if (pingBase) {
          return NextResponse.json({
            verified: false,
            error: `Site is reachable, but Auto Engine endpoint was not found (HTTP ${res.status}). Please make sure Auto Engine plugin v7.5 is active on your WordPress site.`,
          });
        }

        return NextResponse.json({
          verified: false,
          error: `Could not reach ${normalizedUrl} (HTTP ${res.status}). Please check site URL and HTTPS certificate.`,
        });
      } catch (err: unknown) {
        // Fallback for offline / demo mode
        const errorMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          verified: false,
          error: `Connection error: ${errorMsg}. Please verify your domain and that Auto Engine Bridge is enabled.`,
        });
      }
    }

    // MODE 2: STANDARD WORDPRESS REST API (Application Passwords)
    if (connectionMode === 'rest-api') {
      if (!username || !appPassword) {
        return NextResponse.json(
          {
            verified: false,
            error: 'Username and Application Password are required for WordPress REST API mode.',
          },
          { status: 400 }
        );
      }

      try {
        const credentials = Buffer.from(`${username.trim()}:${appPassword.trim()}`).toString('base64');
        const userRes = await fetch(`${normalizedUrl}/wp-json/wp/v2/users/me`, {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Accept': 'application/json',
          },
        });

        if (!userRes.ok) {
          return NextResponse.json({
            verified: false,
            error: `WordPress REST API authentication failed (HTTP ${userRes.status}). Check your Username and Application Password.`,
          });
        }

        const userData = await userRes.json();

        // Fetch categories
        let categories: any[] = [];
        try {
          const catRes = await fetch(`${normalizedUrl}/wp-json/wp/v2/categories?per_page=100`);
          if (catRes.ok) {
            const rawCats = await catRes.json();
            categories = rawCats.map((c: any) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              count: c.count,
            }));
          }
        } catch {
          // ignore categories error
        }

        return NextResponse.json({
          verified: true,
          siteName: new URL(normalizedUrl).hostname,
          siteUrl: normalizedUrl,
          authorName: userData.name || username,
          categories,
          message: 'Connected successfully via WordPress REST API!',
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          verified: false,
          error: `Connection failed: ${errorMsg}`,
        });
      }
    }

    return NextResponse.json({ verified: false, error: 'Invalid connection mode.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ verified: false, error: message }, { status: 500 });
  }
}
