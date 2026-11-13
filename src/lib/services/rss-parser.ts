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

export interface FetchFeedOptions {
  scrapeMissingImages?: boolean;
  scrapeFullArticle?: boolean;
  maxItems?: number;
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
    // Filter out tracking pixels
    if (!src.includes('doubleclick') && !src.includes('pixel') && !src.includes('/stat?') && !src.includes('1x1')) {
      return src;
    }
  }

  return undefined;
}

/**
 * Scrape full article body & OG/Twitter image from the source URL
 * (Faithfully ported from Auto Engine's AE_Feed_Fetcher::fetch_full_article & fetch_og_image)
 */
export async function scrapeArticlePage(url: string): Promise<{ imageUrl?: string; fullContent?: string; excerpt?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 SocialAutoPoster/2.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'hi-IN,hi;q=0.9,en-IN;q=0.8,en;q=0.7',
      },
      next: { revalidate: 300 },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return {};

    let html = await res.text();
    if (!html) return {};

    // Remove scripts and styles
    html = html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?>[\s\S]*?<\/noscript>/gi, '');

    // 1. Extract og:image or twitter:image
    let imageUrl: string | undefined;
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

    if (ogMatch && ogMatch[1]) {
      imageUrl = ogMatch[1].trim();
    }

    // 2. Extract full article body using common news container patterns
    let fullContent: string | undefined;
    const containerPatterns = [
      /<article[^>]*itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=["'][^"']*\b(?:article[-_]?body|article[-_]?content|story[-_]?body|story[-_]?content|post[-_]?content|entry[-_]?content|content[-_]?body)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<article[^>]*class=["'][^"']*\bcontent\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/i,
    ];

    for (const pattern of containerPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const text = stripHtml(match[1]);
        if (text.length > 150) {
          fullContent = match[1].trim();
          break;
        }
      }
    }

    // Fallback: collect largest group of <p> tags
    if (!fullContent) {
      const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      if (pMatches && pMatches.length > 2) {
        const paragraphs = pMatches
          .map((p) => stripHtml(p))
          .filter((t) => t.length > 40 && !t.includes('cookie') && !t.includes('subscribe') && !t.includes('copyright'));
        if (paragraphs.length >= 2) {
          fullContent = paragraphs.map((p) => `<p>${p}</p>`).join('\n');
        }
      }
    }

    const excerpt = fullContent ? stripHtml(fullContent).slice(0, 300) : undefined;
    return { imageUrl, fullContent, excerpt };
  } catch {
    return {};
  }
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
        const linkTag =
          entryBlock.match(/<link[^>]+(?:rel=["']alternate["'][^>]+)?href=["']([^"']+)["']/i) ||
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

export async function fetchAndParseRssFeed(
  url: string,
  options?: FetchFeedOptions
): Promise<ParsedFeed> {
  const normalizedUrl = url.trim();
  const response = await fetch(normalizedUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 SocialAutoPoster/2.0',
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
    // If it's a blogger blog without /feeds/posts/default?alt=rss, try alternate
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

  // Automatic Scraper Fallback (for items lacking images or full body)
  if (options?.scrapeMissingImages || options?.scrapeFullArticle) {
    const limit = options.maxItems || 5;
    for (let i = 0; i < Math.min(parsed.items.length, limit); i++) {
      const item = parsed.items[i];
      const needsImage = !item.imageUrl && options.scrapeMissingImages;
      const needsFullBody = (!item.content || item.content.length < 200) && options.scrapeFullArticle;

      if ((needsImage || needsFullBody) && item.link && item.link.startsWith('http')) {
        const scraped = await scrapeArticlePage(item.link);
        if (needsImage && scraped.imageUrl) {
          item.imageUrl = scraped.imageUrl;
        }
        if (needsFullBody && scraped.fullContent) {
          item.content = scraped.fullContent;
          if (!item.summary && scraped.excerpt) {
            item.summary = scraped.excerpt;
          }
        }
      }
    }
  }

  return parsed;
}
