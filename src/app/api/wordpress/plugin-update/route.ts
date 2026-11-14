import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://game.khabarmonkey.com';
  const downloadUrl = `${origin}/api/wordpress/download-plugin`;

  const pluginInfo = {
    name: 'Social Auto Poster Connector',
    slug: 'social-auto-poster-connector',
    plugin: 'social-auto-poster-connector/social-auto-poster-connector.php',
    version: '1.1.0',
    new_version: '1.1.0',
    author: 'Suzal Dhiman (Khabar Monkey Media)',
    author_profile: 'https://game.khabarmonkey.com',
    homepage: 'https://game.khabarmonkey.com',
    requires: '5.6',
    tested: '6.7',
    requires_php: '7.4',
    last_updated: new Date().toISOString().split('T')[0],
    download_url: downloadUrl,
    package: downloadUrl,
    upgrade_notice: 'Automatic in-dashboard update support, two-way category sync, and multi-title per page dispatcher.',
    sections: {
      description: 'Connects WordPress directly to CreatorFlow Social Auto Poster SaaS. Supports Multiple Social Titles per post (1 title per line), automatic multi-page image variations, category sync, and first-comment article links for maximum reach.',
      installation: '1. Upload plugin to WordPress or install via update.\n2. Configure Webhook URL & Secret Key in Settings > Social Auto Poster.\n3. Publish posts with multi-line social titles!',
      changelog: '<h4>1.1.0</h4><ul><li>Added 1-Click Direct In-Dashboard Updates inside WordPress (no more manual ZIP uploads).</li><li>Added two-way category fetching and publishing API.</li><li>Multi-title line-by-line editor improvements.</li><li>Performance optimizations for instant webhook dispatch.</li></ul>',
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
