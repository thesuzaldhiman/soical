import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { siteUrl, bridgeKey } = body;

    if (!siteUrl || typeof siteUrl !== 'string') {
      return NextResponse.json({ success: false, error: 'Site URL required' }, { status: 400 });
    }

    let normalizedUrl = siteUrl.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const cleanKey =
      typeof bridgeKey === 'string' && bridgeKey.trim()
        ? bridgeKey.trim()
        : 'sap_whsec_908f0a9sdf8a0sd8f';

    const requestHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 CreatorFlow-SaaS/1.0',
      'Accept': 'application/json, text/plain, */*',
      'X-SAP-Secret': cleanKey,
    };

    const categories = await extractAllWordPressCategories(normalizedUrl, requestHeaders);

    return NextResponse.json({
      success: true,
      siteUrl: normalizedUrl,
      categories,
      count: categories.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Category sync failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const siteUrl = searchParams.get('siteUrl');

  if (!siteUrl) {
    return NextResponse.json({ success: false, error: 'siteUrl query parameter required' }, { status: 400 });
  }

  let normalizedUrl = siteUrl.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  const requestHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 CreatorFlow-SaaS/1.0',
    'Accept': 'application/json, text/plain, */*',
  };

  const categories = await extractAllWordPressCategories(normalizedUrl, requestHeaders);

  return NextResponse.json({
    success: true,
    siteUrl: normalizedUrl,
    categories,
    count: categories.length,
    timestamp: new Date().toISOString(),
  });
}

async function extractAllWordPressCategories(
  normalizedUrl: string,
  requestHeaders: Record<string, string>
) {
  let categories: Array<{ id: string | number; name: string; slug: string; count: number }> = [];

  const endpoints = [
    `${normalizedUrl}/wp-json/social-poster/v1/ping`,
    `${normalizedUrl}/?rest_route=/social-poster/v1/ping`,
    `${normalizedUrl}/wp-json/social-poster/v1/categories`,
    `${normalizedUrl}/?rest_route=/social-poster/v1/categories`,
    `${normalizedUrl}/index.php?rest_route=/social-poster/v1/categories`,
    `${normalizedUrl}/wp-json/wp/v2/categories?per_page=100`,
    `${normalizedUrl}/?rest_route=/wp/v2/categories&per_page=100`,
    `${normalizedUrl}/index.php?rest_route=/wp/v2/categories&per_page=100`,
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'GET',
        headers: requestHeaders,
        redirect: 'follow',
      });
      if (res.ok) {
        const text = await res.text();
        const data = JSON.parse(text);
        let list: any[] = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && Array.isArray(data.categories)) {
          list = data.categories;
        }

        if (list.length > 0) {
          categories = list
            .filter((c: any) => c && (c.name || c.slug))
            .map((c: any) => ({
              id: c.id || c.term_id || `cat_${Date.now()}_${Math.random()}`,
              name: String(c.name || c.slug || '').trim(),
              slug: String(c.slug || c.name || '').toLowerCase().trim(),
              count: typeof c.count === 'number' ? c.count : 0,
            }))
            .filter((c) => c.name);

          if (categories.length > 0) return categories;
        }
      }
    } catch {
      // Continue to next endpoint
    }
  }

  // Fallback: Parse categories directly from WordPress RSS XML feed (/feed/)
  try {
    const feedRes = await fetch(`${normalizedUrl}/feed/`, {
      method: 'GET',
      headers: { 'User-Agent': requestHeaders['User-Agent'] || 'CreatorFlow-SaaS/1.0' },
      redirect: 'follow',
    });
    if (feedRes.ok) {
      const xml = await feedRes.text();
      const catMatches = xml.matchAll(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/gi);
      const found = new Set<string>();
      for (const m of catMatches) {
        const name = (m[1] || '').trim();
        if (name && !found.has(name.toLowerCase())) {
          found.add(name.toLowerCase());
          categories.push({
            id: `cat_rss_${found.size}`,
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            count: 1,
          });
        }
      }
    }
  } catch {}

  return categories;
}
