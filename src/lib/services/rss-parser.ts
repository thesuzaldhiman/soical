export interface RssItem {
  id: string;
  title: string;
  link: string;
  pubDate?: string;
  summary: string;
  content?: string;
  imageUrl?: string;
  categories: string[];
}

export interface ParsedFeed {
  title: string;
  description?: string;
  link?: string;
  items: RssItem[];
}

function cleanHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8216;/g, '‘')
    .replace(/&#8217;/g, '’')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(html: string): string {
  return cleanHtmlEntities(
    html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function extractCDataOrText(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(regex);
  if (!match) return '';

  let content = match[1].trim();
  const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
  if (cdataMatch) {
    return cdataMatch[1].trim();
  }
  return cleanHtmlEntities(content);
}

function extractAttr(tagStr: string, attrName: string): string {
  const match = tagStr.match(new RegExp(`${attrName}=["']([^"']+)["']`, 'i'));
  return match ? match[1].trim() : '';
}

function extractFirstImageUrl(block: string): string | undefined {
  // 1. Check <enclosure url="..." type="image/...">
  const enclosureMatch = block.match(/<enclosure[^>]+>/i);
  if (enclosureMatch) {
    const type = extractAttr(enclosureMatch[0], 'type');
    const url = extractAttr(enclosureMatch[0], 'url');
    if (url && (!type || type.startsWith('image/'))) {
      return url;
    }
  }

  // 2. Check <media:content url="..."> or <media:thumbnail url="...">
  const mediaContentMatch = block.match(/<media:(?:content|thumbnail)[^>]+>/i);
  if (mediaContentMatch) {
    const url = extractAttr(mediaContentMatch[0], 'url');
    if (url) return url;
  }

  // 3. Check <itunes:image href="...">
  const itunesMatch = block.match(/<itunes:image[^>]+>/i);
  if (itunesMatch) {
    const href = extractAttr(itunesMatch[0], 'href');
    if (href) return href;
  }

  // 4. Extract first <img> src from content or description
  const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    const src = imgMatch[1];
    // Filter out 1x1 tracking pixels
    if (!src.includes('doubleclick') && !src.includes('pixel') && !src.includes('/stat?')) {
      return src;
    }
  }

  return undefined;
}

export function parseRssOrAtomXml(xmlText: string): ParsedFeed {
  let feedTitle = 'RSS Feed';
  let feedDescription = '';
  let feedLink = '';

  // Extract channel/feed level info
  const channelMatch = xmlText.match(/<channel[\s\S]*?>([\s\S]*?)<\/channel>/i);
  const feedHeader = channelMatch ? channelMatch[1] : xmlText.slice(0, 2000);

  const rawTitle = extractCDataOrText(feedHeader, 'title');
  if (rawTitle) feedTitle = stripHtml(rawTitle);

  const rawDesc = extractCDataOrText(feedHeader, 'description') || extractCDataOrText(feedHeader, 'subtitle');
  if (rawDesc) feedDescription = stripHtml(rawDesc);

  const rawLink = extractCDataOrText(feedHeader, 'link');
  if (rawLink) {
    feedLink = rawLink;
  } else {
    // Atom <link href="..." />
    const linkTagMatch = feedHeader.match(/<link[^>]+href=["']([^"']+)["']/i);
    if (linkTagMatch) feedLink = linkTagMatch[1];
  }

  const items: RssItem[] = [];

  // 1. Try standard RSS <item> blocks
  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi);
  if (itemMatches && itemMatches.length > 0) {
    for (const itemBlock of itemMatches) {
      const title = stripHtml(extractCDataOrText(itemBlock, 'title'));
      let link = extractCDataOrText(itemBlock, 'link');
      if (!link) {
        const linkTag = itemBlock.match(/<link[^>]+href=["']([^"']+)["']/i);
        if (linkTag) link = linkTag[1];
      }

      const guid = extractCDataOrText(itemBlock, 'guid') || link || title;
      const pubDate = extractCDataOrText(itemBlock, 'pubDate') || extractCDataOrText(itemBlock, 'dc:date');
      const contentEncoded = extractCDataOrText(itemBlock, 'content:encoded');
      const description = extractCDataOrText(itemBlock, 'description');
      const summary = stripHtml(description || contentEncoded);
      const imageUrl = extractFirstImageUrl(itemBlock);

      // Extract categories
      const catMatches = itemBlock.match(/<category[^>]*>([\s\S]*?)<\/category>/gi) || [];
      const categories = catMatches
        .map((catStr) => {
          const cdata = catStr.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
          return cdata ? cdata[1].trim() : stripHtml(catStr);
        })
        .filter(Boolean);

      if (title) {
        items.push({
          id: guid,
          title,
          link,
          pubDate,
          summary: summary.slice(0, 300),
          content: contentEncoded || description,
          imageUrl,
          categories,
        });
      }
    }
  } else {
    // 2. Try Atom <entry> blocks
    const entryMatches = xmlText.match(/<entry[\s\S]*?<\/entry>/gi);
    if (entryMatches && entryMatches.length > 0) {
      for (const entryBlock of entryMatches) {
        const title = stripHtml(extractCDataOrText(entryBlock, 'title'));
        let link = '';
        const linkTag = entryBlock.match(/<link[^>]+(?:rel=["']alternate["'][^>]+)?href=["']([^"']+)["']/i) ||
                         entryBlock.match(/<link[^>]+href=["']([^"']+)["']/i);
        if (linkTag) link = linkTag[1];

        const id = extractCDataOrText(entryBlock, 'id') || link || title;
        const updated = extractCDataOrText(entryBlock, 'updated') || extractCDataOrText(entryBlock, 'published');
        const summaryRaw = extractCDataOrText(entryBlock, 'summary');
        const contentRaw = extractCDataOrText(entryBlock, 'content');
        const summary = stripHtml(summaryRaw || contentRaw);
        const imageUrl = extractFirstImageUrl(entryBlock);

        const catMatches = entryBlock.match(/<category[^>]+term=["']([^"']+)["']/gi) || [];
        const categories = catMatches
          .map((catStr) => extractAttr(catStr, 'term'))
          .filter(Boolean);

        if (title) {
          items.push({
            id,
            title,
            link,
            pubDate: updated,
            summary: summary.slice(0, 300),
            content: contentRaw || summaryRaw,
            imageUrl,
            categories,
          });
        }
      }
    }
  }

  return {
    title: feedTitle,
    description: feedDescription,
    link: feedLink,
    items,
  };
}

export async function fetchAndParseRssFeed(url: string): Promise<ParsedFeed> {
  const normalizedUrl = url.trim();
  const response = await fetch(normalizedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SocialAutoPoster/2.0',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed. HTTP status: ${response.status} ${response.statusText}`);
  }

  const xmlText = await response.text();
  const parsed = parseRssOrAtomXml(xmlText);

  if (!parsed.items || parsed.items.length === 0) {
    // If it's a blogger blog without /feeds/posts/default?alt=rss, give guidance or try alternate
    if (normalizedUrl.includes('.blogspot.com') && !normalizedUrl.includes('/feeds/')) {
      const cleanBase = normalizedUrl.replace(/\/$/, '');
      const altUrl = `${cleanBase}/feeds/posts/default?alt=rss`;
      const retryRes = await fetch(altUrl, {
        headers: { 'User-Agent': 'SocialAutoPoster/2.0' },
      });
      if (retryRes.ok) {
        const altXml = await retryRes.text();
        return parseRssOrAtomXml(altXml);
      }
    }
  }

  return parsed;
}
