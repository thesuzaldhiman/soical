import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Determine canonical public origin (avoid internal 0.0.0.0:3000 proxy addresses)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');
  let proto = request.headers.get('x-forwarded-proto') || 'https';

  let origin = process.env.NEXT_PUBLIC_APP_URL || 'https://game.khabarmonkey.com';

  if (forwardedHost && !forwardedHost.includes('0.0.0.0') && !forwardedHost.includes('localhost')) {
    origin = `${proto}://${forwardedHost}`;
  } else if (host && !host.includes('0.0.0.0') && !host.includes('127.0.0.1') && !host.includes('localhost')) {
    origin = `https://${host}`;
  } else if (request.nextUrl.origin && !request.nextUrl.origin.includes('0.0.0.0')) {
    origin = request.nextUrl.origin;
  }

  // Force HTTPS if non-localhost
  if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    origin = origin.replace(/^http:\/\//i, 'https://');
  }

  // Ensure origin is clean
  origin = origin.replace(/\/+$/, '');

  const downloadUrl = `${origin}/api/wordpress/download-plugin`;

  const pluginInfo = {
    name: 'Social Auto Poster Connector',
    slug: 'social-auto-poster-connector',
    plugin: 'social-auto-poster-connector/social-auto-poster-connector.php',
    version: '1.3.5',
    new_version: '1.3.5',
    author: 'Suzal Dhiman (Khabar Monkey Media)',
    author_profile: 'https://game.khabarmonkey.com',
    homepage: 'https://game.khabarmonkey.com',
    requires: '5.6',
    tested: '6.7',
    requires_php: '7.4',
    last_updated: new Date().toISOString().split('T')[0],
    download_url: downloadUrl,
    package: downloadUrl,
    upgrade_notice: 'Version 1.3.5: Added Default OG Title override for Comment Previews (Website Name only, preserving original article featured image preview), Rank Math, Yoast SEO, AIOSEO & universal Open Graph compatibility.',
    sections: {
      description:
        'Connects WordPress directly to CreatorFlow Social Auto Poster SaaS. Supports Multiple Social Titles per post (1 title per line), automatic multi-page image variations, category sync, and first-comment article links for maximum reach.',
      installation:
        '1. Click "Update Now" in WordPress Plugins dashboard, or upload the zip archive.\n2. Configure Webhook URL & Secret Key in Settings > Social Auto Poster.\n3. Publish posts with multi-line social titles!',
      changelog:
        '<h4>1.3.5</h4><ul><li>Default OG Title override: Automatically displays only the Website Name (Site Title) in Facebook comment link preview cards, leaving the article image preview 100% intact.</li><li>Universal compatibility with Rank Math, Yoast SEO, All in One SEO, SEOPress, Jetpack, and custom themes.</li><li>Customizable Site Name option in plugin settings.</li></ul>' +
        '<h4>1.3.4</h4><ul><li>Added Per-Page Title & Subtitle Studio, live connected page mapping, Gutenberg REST API meta registration, and bulletproof content image extraction.</li></ul>',
    },
    banners: {
      high: `${origin}/icons/social/wordpress.png`,
      low: `${origin}/icons/social/wordpress.png`,
    },
  };

  return NextResponse.json(pluginInfo, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
