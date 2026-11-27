import { NextRequest, NextResponse } from 'next/server';
import { dispatchToTargets, PublishTarget } from '@/lib/services/publisher';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { DEMO_CATEGORIES, DEMO_PAGES, INITIAL_SIG_TEMPLATES, INITIAL_REEL_TEMPLATES } from '@/lib/state/mock-data';
import { AutomationFeed, PageCategory, Post, SocialPage, SigTemplate, AppSettings } from '@/types';
import { generateServerCardImage, generateServerCardFrameLayer } from '@/lib/services/server-image-generator';
import { generateServerVideoReel } from '@/lib/services/server-video-generator';
import { sanitizePostMedia, offloadBase64Media } from '@/lib/utils/media-storage';
import { cleanHeadlineText, decodeHtmlEntities } from '@/lib/utils/text-decoder';
import fs from 'fs';
import path from 'path';

const LOCAL_STORE_FILE = path.join(process.cwd(), 'src', 'lib', 'data', 'mcp-posts-cache.json');

function parseJsonSafe(val: any, fallback: any) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function formatAutomationCaption({
  title,
  subtitle,
  excerpt,
  permalink,
  captionStyle = 'title_char_limit',
  charLimit = 80,
  seeMoreText = '...See more',
  linkPlacement = 'first_comment',
  commentTemplate = '👉 पूरी खबर यहाँ पढ़ें: {link}',
}: {
  title: string;
  subtitle?: string;
  excerpt?: string;
  permalink?: string;
  captionStyle?: 'title_char_limit' | 'news_points' | 'full_title';
  charLimit?: number;
  seeMoreText?: string;
  linkPlacement?: 'first_comment' | 'in_caption' | 'none';
  commentTemplate?: string;
}): { caption: string; commentText: string } {
  let baseText = '';

  if (captionStyle === 'title_char_limit') {
    const limit = Math.max(20, charLimit || 80);
    const suffix = (seeMoreText || '...See more')
      .replace(/^[\s\u00A0\u200B]+/, '')
      .replace(/^(\.{2,}|…)[\s\u00A0\u200B]+/, '$1');
    if (title.length > limit) {
      const truncated = title.substring(0, limit);
      const lastSpace = truncated.lastIndexOf(' ');
      const cleanCut = lastSpace > limit * 0.6 ? truncated.substring(0, lastSpace) : truncated;
      const cleanCutTrimmed = cleanCut.replace(/[\s\u00A0\u200B,:;\-]+$/, '').trim();
      baseText = `${cleanCutTrimmed}${suffix}`;
    } else {
      baseText = title;
    }
  } else if (captionStyle === 'news_points') {
    baseText = title;
    if (subtitle) {
      baseText += `\n📌 ${subtitle}`;
    }
    if (excerpt) {
      baseText += `\n\n${excerpt}`;
    }
  } else {
    // 'full_title'
    baseText = title;
  }

  let finalCaption = baseText.trim();
  let commentText = '';

  if (permalink) {
    if (linkPlacement === 'first_comment') {
      const template = commentTemplate || '👉 पूरी खबर यहाँ पढ़ें: {link}';
      commentText = template.replace(/\{link\}/g, permalink);
    } else if (linkPlacement === 'in_caption') {
      finalCaption += `\n\n👉 पूरी खबर यहाँ पढ़ें: ${permalink}`;
    }
  }

  return { caption: finalCaption, commentText };
}

function getLocalPosts(): Post[] {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function saveLocalPosts(posts: Post[]) {
  try {
    const dir = path.dirname(LOCAL_STORE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(posts.slice(0, 300), null, 2), 'utf-8');
  } catch (err) {
    console.warn('[WP Webhook] Failed saving local posts cache:', err);
  }
}

interface DripSlotOptions {
  existingPosts: Post[];
  targetPageIds: string[];
  minMinutes?: number;
  maxMinutes?: number;
  enableNightSleep?: boolean;
  activeHoursStart?: string;
  activeHoursEnd?: string;
}

function calculateNextDripSlot(options: DripSlotOptions): {
  scheduledAt: Date;
  intervalMinutes: number;
  shiftedForNight: boolean;
} {
  const minMin = Math.max(1, Number(options.minMinutes) || 27);
  const maxMin = Math.max(minMin, Number(options.maxMinutes) || 33);
  const randIntervalMinutes = Math.floor(Math.random() * (maxMin - minMin + 1)) + minMin;

  const now = Date.now();
  const targetPageSet = new Set(options.targetPageIds || []);

  // 1. Find the latest scheduled post in the future for any of these target pages
  let latestScheduledMs = 0;
  if (Array.isArray(options.existingPosts)) {
    for (const p of options.existingPosts) {
      if (p.status !== 'scheduled' || !p.scheduledAt) continue;
      const postPageIds = Array.isArray(p.pageIds) ? p.pageIds : [];
      const hasOverlap = targetPageSet.size === 0 || postPageIds.some((pid) => targetPageSet.has(pid));
      if (!hasOverlap) continue;

      const schedMs = new Date(p.scheduledAt).getTime();
      if (!isNaN(schedMs) && schedMs > latestScheduledMs) {
        latestScheduledMs = schedMs;
      }
    }
  }

  // 2. Calculate candidate slot timestamp
  let candidateMs = 0;
  if (latestScheduledMs > now) {
    candidateMs = latestScheduledMs + randIntervalMinutes * 60 * 1000;
  } else {
    candidateMs = now + randIntervalMinutes * 60 * 1000;
  }

  let shiftedForNight = false;

  // 3. Handle Night Sleep / Active Hours (Indian Standard Time: UTC+5:30)
  if (options.enableNightSleep !== false) {
    const startStr = options.activeHoursStart || '07:00';
    const endStr = options.activeHoursEnd || '23:00';

    const [startH, startM] = startStr.split(':').map((v) => parseInt(v, 10) || 0);
    const [endH, endM] = endStr.split(':').map((v) => parseInt(v, 10) || 0);

    const startMinuteOfDay = startH * 60 + startM;
    const endMinuteOfDay = endH * 60 + endM;

    // Convert candidateMs to IST Date components (UTC + 5.5 hours)
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(candidateMs + IST_OFFSET_MS);

    const istHour = istTime.getUTCHours();
    const istMinute = istTime.getUTCMinutes();
    const candidateMinuteOfDay = istHour * 60 + istMinute;

    if (candidateMinuteOfDay >= endMinuteOfDay || candidateMinuteOfDay < startMinuteOfDay) {
      shiftedForNight = true;
      const jitterMs = Math.floor(Math.random() * 6) * 60 * 1000; // 0-5 mins natural human jitter

      if (candidateMinuteOfDay >= endMinuteOfDay) {
        // Shift to tomorrow's active start time
        istTime.setUTCDate(istTime.getUTCDate() + 1);
      }
      istTime.setUTCHours(startH, startM, 0, 0);

      // Convert back from IST to UTC ms
      candidateMs = istTime.getTime() - IST_OFFSET_MS + jitterMs;
    }
  }

  return {
    scheduledAt: new Date(candidateMs),
    intervalMinutes: randIntervalMinutes,
    shiftedForNight,
  };
}

async function persistPosts(newPosts: Post[], email: string = 'suzaldhiman@gmail.com') {
  const sanitizedNewPosts = newPosts.map((p) => sanitizePostMedia(p));
  const localCurrent = getLocalPosts();
  saveLocalPosts([...sanitizedNewPosts, ...localCurrent]);

  const pool = getDbPool();
  if (!pool) return;

  try {
    const cleanEmail = email.toLowerCase().trim();
    const [rows] = await pool.query<any[]>(
      'SELECT posts, workspace, logs FROM app_user_data WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (rows && rows.length > 0) {
      const existingPosts = parseJsonSafe(rows[0].posts, []);
      const updatedPosts = [...sanitizedNewPosts, ...existingPosts].slice(0, 500);
      const ws = parseJsonSafe(rows[0].workspace, { monthlyPostsUsed: 0 });
      const successfulCount = newPosts.filter((p) => p.status === 'published').length;
      ws.monthlyPostsUsed = (ws.monthlyPostsUsed || 0) + successfulCount;

      // Extract new audit log entries from post results
      const existingLogs = parseJsonSafe(rows[0].logs, []);
      const newLogs = newPosts.flatMap((post) =>
        (post.results || []).map((r, idx) => ({
          id: `log_${post.id}_${r.pageId}_${idx}`,
          postId: post.id,
          postMessage: post.message,
          postType: post.postType,
          mediaUrl: post.mediaUrl,
          pageId: r.pageId,
          pageName: r.pageName,
          platform: r.platform,
          status: r.status,
          externalPostId: r.externalPostId,
          commentId: r.commentId,
          commentStatus: r.commentStatus,
          commentError: r.commentError,
          error: r.error,
          timestamp: r.timestamp || new Date().toISOString(),
        }))
      );
      const updatedLogs = [...newLogs, ...existingLogs].slice(0, 1000);

      await pool.query(
        'UPDATE app_user_data SET posts = ?, workspace = ?, logs = ?, updated_at = NOW() WHERE email = ?',
        [JSON.stringify(updatedPosts), JSON.stringify(ws), JSON.stringify(updatedLogs), cleanEmail]
      );
    }
  } catch (err) {
    console.warn('[WP Webhook] Failed persisting posts to MySQL:', err);
  }
}

async function resolveUserState(siteUrl: string = '', explicitEmail?: string): Promise<{
  email: string;
  pages: SocialPage[];
  categories: PageCategory[];
  automations: AutomationFeed[];
  posts: Post[];
  sigTemplates: SigTemplate[];
  reelTemplates: SigTemplate[];
  settings?: AppSettings;
}> {
  const fallbackEmail = (explicitEmail || 'suzaldhiman@gmail.com').toLowerCase().trim();
  const pool = getDbPool();
  if (!pool) {
    return {
      email: fallbackEmail,
      pages: DEMO_PAGES,
      categories: DEMO_CATEGORIES,
      automations: [] as AutomationFeed[],
      posts: getLocalPosts(),
      sigTemplates: INITIAL_SIG_TEMPLATES,
      reelTemplates: INITIAL_REEL_TEMPLATES,
      settings: {} as AppSettings,
    };
  }

  try {
    await initDbTables();
    const cleanSite = (siteUrl || '').trim().toLowerCase().replace(/\/+$/, '');

    // 1. If explicit email passed, use it directly
    if (explicitEmail) {
      const [rows] = await pool.query<any[]>(
        'SELECT email, pages, categories, posts, automations, sig_templates, reel_templates, settings FROM app_user_data WHERE email = ? LIMIT 1',
        [fallbackEmail]
      );
      if (rows && rows.length > 0) {
        return {
          email: rows[0].email,
          pages: parseJsonSafe(rows[0].pages, DEMO_PAGES),
          categories: parseJsonSafe(rows[0].categories, []),
          automations: parseJsonSafe(rows[0].automations, []),
          posts: parseJsonSafe(rows[0].posts, getLocalPosts()),
          sigTemplates: parseJsonSafe(rows[0].sig_templates, INITIAL_SIG_TEMPLATES),
          reelTemplates: parseJsonSafe(rows[0].reel_templates, INITIAL_REEL_TEMPLATES),
          settings: parseJsonSafe(rows[0].settings, {}),
        };
      }
    }

    // 2. Query all tenant users to find the owner of this site
    const [allUsers] = await pool.query<any[]>(
      'SELECT email, pages, categories, posts, automations, accounts, sig_templates, reel_templates, settings FROM app_user_data'
    );

    if (allUsers && allUsers.length > 0) {
      if (cleanSite) {
        for (const u of allUsers) {
          const autos = parseJsonSafe(u.automations, []);
          const hasAuto = autos.some((a: any) => {
            const aSite = (a.siteUrl || a.feedUrl || '').trim().toLowerCase().replace(/\/+$/, '');
            return aSite && (aSite.includes(cleanSite) || cleanSite.includes(aSite));
          });
          if (hasAuto) {
            return {
              email: u.email,
              pages: parseJsonSafe(u.pages, DEMO_PAGES),
              categories: parseJsonSafe(u.categories, []),
              automations: autos,
              posts: parseJsonSafe(u.posts, getLocalPosts()),
              sigTemplates: parseJsonSafe(u.sig_templates, INITIAL_SIG_TEMPLATES),
              reelTemplates: parseJsonSafe(u.reel_templates, INITIAL_REEL_TEMPLATES),
              settings: parseJsonSafe(u.settings, {}),
            };
          }

          const accs = parseJsonSafe(u.accounts, []);
          const hasAcc = accs.some((a: any) => {
            const aSite = (a.siteUrl || '').trim().toLowerCase().replace(/\/+$/, '');
            return aSite && (aSite.includes(cleanSite) || cleanSite.includes(aSite));
          });
          if (hasAcc) {
            return {
              email: u.email,
              pages: parseJsonSafe(u.pages, DEMO_PAGES),
              categories: parseJsonSafe(u.categories, []),
              automations: autos,
              posts: parseJsonSafe(u.posts, getLocalPosts()),
              sigTemplates: parseJsonSafe(u.sig_templates, INITIAL_SIG_TEMPLATES),
              reelTemplates: parseJsonSafe(u.reel_templates, INITIAL_REEL_TEMPLATES),
              settings: parseJsonSafe(u.settings, {}),
            };
          }

          const pgs = parseJsonSafe(u.pages, []);
          const hasPage = pgs.some((p: any) => {
            const pSite = (p.siteUrl || '').trim().toLowerCase().replace(/\/+$/, '');
            return pSite && (pSite.includes(cleanSite) || cleanSite.includes(pSite));
          });
          if (hasPage) {
            return {
              email: u.email,
              pages: pgs,
              categories: parseJsonSafe(u.categories, []),
              automations: autos,
              posts: parseJsonSafe(u.posts, getLocalPosts()),
              sigTemplates: parseJsonSafe(u.sig_templates, INITIAL_SIG_TEMPLATES),
              reelTemplates: parseJsonSafe(u.reel_templates, INITIAL_REEL_TEMPLATES),
              settings: parseJsonSafe(u.settings, {}),
            };
          }
        }
      }

      // Default to user with active configured pages/automations
      const activeUser =
        allUsers.find((u) => {
          const pgs = parseJsonSafe(u.pages, []);
          const autos = parseJsonSafe(u.automations, []);
          return pgs.length > 0 || autos.length > 0;
        }) || allUsers[0];

      return {
        email: activeUser.email,
        pages: parseJsonSafe(activeUser.pages, DEMO_PAGES),
        categories: parseJsonSafe(activeUser.categories, []),
        automations: parseJsonSafe(activeUser.automations, []),
        posts: parseJsonSafe(activeUser.posts, getLocalPosts()),
        sigTemplates: parseJsonSafe(activeUser.sig_templates, INITIAL_SIG_TEMPLATES),
        reelTemplates: parseJsonSafe(activeUser.reel_templates, INITIAL_REEL_TEMPLATES),
        settings: parseJsonSafe(activeUser.settings, {}),
      };
    }
  } catch (err) {
    console.warn('[WP Webhook] Database user resolve error, using fallback:', err);
  }

  return {
    email: fallbackEmail,
    pages: DEMO_PAGES,
    categories: [] as PageCategory[],
    automations: [] as AutomationFeed[],
    posts: getLocalPosts(),
    sigTemplates: INITIAL_SIG_TEMPLATES,
    reelTemplates: INITIAL_REEL_TEMPLATES,
    settings: {} as AppSettings,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (action === 'get_pages' || action === 'get_targets') {
    const siteUrl = searchParams.get('site_url') || '';
    const userState = await resolveUserState(siteUrl);
    const allPages = userState.pages || [];
    const allAutomations = (userState as any).automations || [];

    const socialPages = allPages.filter(
      (p) => p.platform === 'facebook' || p.platform === 'telegram' || p.accessToken
    );

    return NextResponse.json({
      success: true,
      pages: socialPages.map((p) => ({
        id: p.id,
        pageId: p.pageId,
        name: p.name,
        platform: p.platform,
        category: p.category,
      })),
      rules: allAutomations.map((a: any) => ({
        id: a.id,
        name: a.name,
        wpCategory: a.wpCategory,
        siteUrl: a.siteUrl || a.feedUrl,
        targetPageIds: a.targetPageIds || [],
        targetCategoryId: a.targetCategoryId,
        isActive: a.isActive,
      })),
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  return NextResponse.json({
    status: 'active',
    service: 'Social Auto Poster WordPress Ingestion Engine',
    version: '2.5.0',
    capabilities: [
      'website_to_fb_automation',
      'anti_spam_category_isolation',
      'multi_title_per_page',
      'ai_image_and_link_formats',
      'first_comment_link',
      'instant_publish_hook',
    ],
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const headerSecret = request.headers.get('x-sap-secret');
    const querySecret = searchParams.get('secret');

    const payload = await request.json().catch(() => ({}));
    const secret = querySecret || headerSecret || payload.secret || payload.secret_key;

    // Check for test connection event
    if (payload.event === 'test_connection' || payload.action === 'test_connection' || payload.test) {
      return NextResponse.json({
        success: true,
        message: 'Connected successfully to Social Auto Poster SaaS! Multi-title engine ready.',
        site_url: payload.site_url,
        timestamp: new Date().toISOString(),
      });
    }

    // Webhook authorization check
    if (!secret || secret.length < 8) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing Webhook Secret Key' }, { status: 401 });
    }

    const rawMainTitle = (payload.main_title || payload.title || '').trim();
    const mainTitle = cleanHeadlineText(rawMainTitle);
    if (!mainTitle) {
      return NextResponse.json({ error: 'Missing post title in payload' }, { status: 400 });
    }

    const socialTitles: string[] = Array.isArray(payload.social_titles)
      ? payload.social_titles.map((t: any) => cleanHeadlineText(String(t))).filter(Boolean)
      : [];

    const permalink = (payload.permalink || '').trim();
    const incomingSiteUrl = (payload.site_url || '').trim().replace(/\/+$/, '').toLowerCase();
    const explicitEmail = (payload.user_email || payload.email || '').trim().toLowerCase();
    const excerpt = cleanHeadlineText(payload.excerpt || '');
    const categories: string[] = Array.isArray(payload.categories)
      ? payload.categories
      : payload.category
      ? [payload.category]
      : [];

    // Helper: validate if URL is a genuine article photo (not an avatar, author icon, or placeholder)
    function isValidArticleImage(url?: string | null): boolean {
      if (!url || typeof url !== 'string') return false;
      const clean = url.trim().toLowerCase();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;
      if (
        clean.includes('editoricon') ||
        clean.includes('avatar') ||
        clean.includes('gravatar') ||
        clean.includes('picsum.photos') ||
        clean.includes('wp-includes') ||
        clean.includes('favicon') ||
        clean.endsWith('.svg') ||
        clean.includes('data:image/svg')
      ) {
        return false;
      }
      return true;
    }

    function extractUrlFromImgAttributes(tagHtml: string): string | null {
      if (!tagHtml || typeof tagHtml !== 'string') return null;
      const attrRegex = /(?:src|data-src|data-lazy-src|data-original|data-actualsrc)=["']([^"']+)["']/gi;
      let m;
      while ((m = attrRegex.exec(tagHtml)) !== null) {
        const val = m[1]?.trim();
        if (isValidArticleImage(val)) {
          return val;
        }
      }
      return null;
    }

    function extractFirstContentImage(htmlOrContent: string): string | null {
      if (!htmlOrContent || typeof htmlOrContent !== 'string') return null;

      // 1. First priority: Check <figure class="ae-inline-image"> or any <figure> with <img>
      // (This is where Auto Engine and news editors place the top featured image inside the post body)
      const figureRegex = /<figure[^>]*>([\s\S]*?)<\/figure>/gi;
      let figMatch;
      while ((figMatch = figureRegex.exec(htmlOrContent)) !== null) {
        const url = extractUrlFromImgAttributes(figMatch[1]);
        if (url) return url;
      }

      // 2. Second priority: Any <img> tag in order of appearance
      const imgRegex = /<img\b[^>]*>/gi;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(htmlOrContent)) !== null) {
        const url = extractUrlFromImgAttributes(imgMatch[0]);
        if (url) return url;
      }

      // 3. Third priority: Gutenberg block comments <!-- wp:image {"url":"..."} -->
      const wpImgRegex = /<!--\s*wp:image\b[^>]*?(\{[\s\S]*?\})\s*-->/gi;
      let wpMatch;
      while ((wpMatch = wpImgRegex.exec(htmlOrContent)) !== null) {
        try {
          const parsed = JSON.parse(wpMatch[1]);
          if (parsed.url && isValidArticleImage(parsed.url)) return parsed.url.trim();
        } catch {}
      }

      // 4. Fourth priority: Markdown images ![alt](url)
      const mdRegex = /!\[.*?\]\((https?:\/\/[^\s\)\"\']+)\)/gi;
      let mdMatch;
      while ((mdMatch = mdRegex.exec(htmlOrContent)) !== null) {
        if (isValidArticleImage(mdMatch[1])) return mdMatch[1].trim();
      }

      return null;
    }

    let imageUrl = (payload.image_url || payload.featured_image || '').trim();
    if (!isValidArticleImage(imageUrl)) {
      imageUrl = '';
    }

    // Fallback 1: Extract first genuine image from article body content sent in payload
    if (!imageUrl) {
      const rawContent = String(
        payload.content_html || payload.content || payload.body || payload.post_content || ''
      );
      const extracted = extractFirstContentImage(rawContent);
      if (extracted) {
        imageUrl = extracted;
      }
    }

    // Fallback 2: Check WordPress REST API directly if post_id and site_url exist
    if (!imageUrl && payload.post_id && (payload.site_url || incomingSiteUrl)) {
      try {
        const siteBase = (payload.site_url || incomingSiteUrl).replace(/\/+$/, '');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const wpApiRes = await fetch(`${siteBase}/wp-json/wp/v2/posts/${payload.post_id}?_embed`, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });
        clearTimeout(timeout);
        if (wpApiRes.ok) {
          const wpPost = await wpApiRes.json();
          const mediaItem = wpPost._embedded?.['wp:featuredmedia']?.[0]?.source_url;
          if (mediaItem && isValidArticleImage(mediaItem)) {
            imageUrl = mediaItem.trim();
          } else if (wpPost.content?.rendered) {
            const extracted = extractFirstContentImage(wpPost.content.rendered);
            if (extracted) {
              imageUrl = extracted;
            }
          }
        }
      } catch (err) {
        console.warn('[WP Webhook] Fallback 2 REST error:', err);
      }
    }

    // Fallback 3: Live permalink / ?p=post_id scrape (with UTF-8 and ID query support)
    if (!imageUrl && (permalink || payload.post_id)) {
      try {
        const candidateUrls: string[] = [];
        if (permalink) {
          candidateUrls.push(permalink);
          if (permalink.startsWith('http://')) {
            candidateUrls.push(permalink.replace('http://', 'https://'));
          }
        }
        if (payload.post_id && (payload.site_url || incomingSiteUrl)) {
          const siteBase = (payload.site_url || incomingSiteUrl).replace(/\/+$/, '');
          candidateUrls.push(`${siteBase}/?p=${payload.post_id}`);
        }

        for (const testUrl of candidateUrls) {
          if (imageUrl) break;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 7000);
            const pageRes = await fetch(testUrl, {
              signal: controller.signal,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              },
            });
            clearTimeout(timeout);
            if (pageRes.ok) {
              const html = await pageRes.text();
              const ogMatch =
                html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
                html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
              if (ogMatch && isValidArticleImage(ogMatch[1])) {
                imageUrl = ogMatch[1].trim();
              } else {
                const containerMatch = html.match(
                  /<(?:div|article|main|section)[^>]+(?:id=["'](?:post-body-content|content)["']|class=["'][^"']*(?:post-content|entry-content|article-content|wp-block-post-content)[^"']*["'])[^>]*>([\s\S]*?)<\/(?:div|article|main|section)>/i
                );
                const searchArea = containerMatch ? containerMatch[1] : html;
                const extracted = extractFirstContentImage(searchArea);
                if (extracted) {
                  imageUrl = extracted;
                }
              }
            }
          } catch {}
        }
      } catch (err) {
        console.warn('[WP Webhook] Fallback 3 scrape error:', err);
      }
    }

    console.log(`[WP Webhook] Article image extraction resolved to: ${imageUrl || '(none)'}`);

    // 1. Fetch user pages, categories & automations dynamically for this site's owner
    const userState = await resolveUserState(incomingSiteUrl, explicitEmail);
    const resolvedEmail = userState.email;
    const allPages: SocialPage[] = userState.pages || [];
    const allCategories: PageCategory[] = userState.categories || [];
    const allAutomations: AutomationFeed[] = (userState as any).automations || [];
    const allSigTemplates: SigTemplate[] = (userState.sigTemplates || INITIAL_SIG_TEMPLATES).filter(
      (t) => t.templateType !== 'reel'
    );
    const allReelTemplates: SigTemplate[] =
      userState.reelTemplates && userState.reelTemplates.length > 0
        ? userState.reelTemplates
        : INITIAL_REEL_TEMPLATES;
    const allPosts: Post[] = userState.posts || [];

    const postCategories = categories.map((c: string) => c.toLowerCase().trim());

    // 2. Resolve All Matching Automation Rules & Target Pages
    interface WebhookRuleJob {
      ruleName: string;
      rule?: AutomationFeed;
      pages: SocialPage[];
    }
    const executionJobs: WebhookRuleJob[] = [];

    // A. Explicit targets passed directly in payload
    if (Array.isArray(payload.targets) && payload.targets.length > 0) {
      const explicitIds = new Set(payload.targets.map((t: any) => t.id || t.pageId));
      const explicitPages = allPages.filter((p) => explicitIds.has(p.id) || explicitIds.has(p.pageId));
      if (explicitPages.length > 0) {
        executionJobs.push({
          ruleName: 'Explicit Target Payload',
          rule: undefined,
          pages: explicitPages,
        });
      }
    }

    // B. Check ALL Active Website to FB Automation Rules (so separate Image & Reel rules on same category both execute!)
    if (executionJobs.length === 0 && allAutomations.length > 0) {
      const matchedRules = allAutomations.filter((rule) => {
        if (rule.isActive === false) return false;
        if (rule.type !== 'website_to_fb' && rule.type !== 'wordpress') return false;

        // Check Site Match
        const ruleSite = (rule.siteUrl || rule.feedUrl || '').trim().replace(/\/+$/, '').toLowerCase();
        const siteMatches =
          !ruleSite ||
          ruleSite === '*' ||
          !incomingSiteUrl ||
          ruleSite.includes(incomingSiteUrl) ||
          incomingSiteUrl.includes(ruleSite);

        if (!siteMatches) return false;

        // Check Category Match
        const ruleCategory = (rule.wpCategory || '').trim().toLowerCase();
        if (!ruleCategory || ruleCategory === '*' || ruleCategory === 'all') {
          return true;
        }

        return postCategories.some(
          (c) => c.includes(ruleCategory) || ruleCategory.includes(c)
        );
      });

      for (const rule of matchedRules) {
        let rulePages: SocialPage[] = [];
        if (Array.isArray(rule.targetPageIds) && rule.targetPageIds.length > 0) {
          const rulePageIds = new Set(rule.targetPageIds);
          rulePages = allPages.filter((p) => rulePageIds.has(p.id) || rulePageIds.has(p.pageId));
        } else if (rule.targetCategoryId) {
          const targetCatId = rule.targetCategoryId;
          const catGroup = allCategories.find((c) => c.id === targetCatId);
          if (catGroup && catGroup.pageIds) {
            const catPageIds = new Set(catGroup.pageIds);
            rulePages = allPages.filter((p) => catPageIds.has(p.id) || catPageIds.has(p.pageId));
          }
        }
        if (rulePages.length > 0) {
          executionJobs.push({
            ruleName: rule.name,
            rule,
            pages: rulePages,
          });
        }
      }
    }

    // STRICT ANTI-SPAM PROTECTION:
    // If NO active Website to FB automation rule matched, STOP! DO NOT POST OR SAVE DRAFTS!
    if (executionJobs.length === 0) {
      console.log(
        `[WP Webhook] Post "${mainTitle}" for site "${incomingSiteUrl}" in categories [${categories.join(
          ', '
        )}] was SKIPPED. No active Website to FB automation rule matches this category. Prevents spam.`
      );

      return NextResponse.json({
        success: true,
        dispatched: false,
        skipped: true,
        reason: 'no_matching_active_rule',
        message: `Post received for category "${categories.join(
          ', '
        )}", but no active Website to FB automation rule is mapped to this category. Safely skipped without creating any draft or post.`,
        category: categories[0] || 'General',
        site_url: payload.site_url,
      });
    }

    // 3. Prepare Multi-Title & Subtitle Mapping once for incoming payload
    const incomingVariations: Array<{ page_id?: string; page_name?: string; title?: string; subtitle?: string }> =
      Array.isArray(payload.variations)
        ? payload.variations
        : typeof payload.variations === 'string'
        ? parseJsonSafe(payload.variations, [])
        : [];

    const rawSocialTitles: string[] = Array.isArray(payload.social_titles)
      ? payload.social_titles
      : typeof payload.social_titles === 'string'
      ? payload.social_titles.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0)
      : [];

    interface TitleVariationItem {
      title: string;
      subtitle?: string;
      pageId?: string;
      pageName?: string;
    }

    const availableTitleVariations: TitleVariationItem[] = [];

    if (incomingVariations.length > 0) {
      for (const v of incomingVariations) {
        if (v && v.title && v.title.trim()) {
          availableTitleVariations.push({
            title: v.title.trim(),
            subtitle: v.subtitle?.trim() || undefined,
            pageId: v.page_id,
            pageName: v.page_name,
          });
        }
      }
    }

    if (rawSocialTitles.length > 0) {
      rawSocialTitles.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        let t = trimmed;
        let s: string | undefined = undefined;
        if (trimmed.includes('|')) {
          const parts = trimmed.split('|');
          t = parts[0]?.trim() || trimmed;
          s = parts.slice(1).join('|').trim() || undefined;
        }
        if (!availableTitleVariations[idx]) {
          availableTitleVariations[idx] = { title: t, subtitle: s };
        } else if (!availableTitleVariations[idx].title) {
          availableTitleVariations[idx].title = t;
          if (s && !availableTitleVariations[idx].subtitle) availableTitleVariations[idx].subtitle = s;
        }
      });
    }

    const totalTitlesProvided = availableTitleVariations.filter((v) => v && v.title?.trim()).length;
    const normalizedNewTitle = mainTitle.trim().toLowerCase();
    const candidateLink = (payload.shortlink || permalink || payload.link || payload.url || '').trim().toLowerCase();
    const userSettings: Partial<AppSettings> = userState.settings || {};

    const dispatchResults: any[] = [];
    const allPostsToPersist: Post[] = [];
    const matchedRuleNames: string[] = [];
    let lastDispatchFormat: 'ai_image' | 'featured_image' | 'link_card' | 'text_only' | 'ai_reel' | 'image_and_reel' = 'ai_image';
    let lastIsDraftMode = false;
    let lastIsDripQueueMode = false;
    let lastAddFirstComment = true;
    let totalAssignedPages = 0;

    // Track (pageId|postType) processed in this webhook request too
    const inRequestProcessedKeys = new Set<string>();

    for (const job of executionJobs) {
      const matchingRule = job.rule;
      const matchedRuleName = job.ruleName;
      let selectedSigTemplateId = matchingRule?.sigTemplateId;

      // Resolve Format (auto-infer ai_reel if selectedSigTemplateId belongs to Reel Studio library!)
      const isReelTemplateId =
        !!selectedSigTemplateId &&
        (allReelTemplates.some((r) => r.id === selectedSigTemplateId) ||
          String(selectedSigTemplateId).startsWith('tmpl_reel'));

      let dispatchFormat: 'ai_image' | 'featured_image' | 'link_card' | 'text_only' | 'ai_reel' | 'image_and_reel' =
        matchingRule?.format || (matchingRule?.autoGenerateImage ? 'ai_image' : 'featured_image');
      if (isReelTemplateId && (dispatchFormat === 'ai_image' || !matchingRule?.format)) {
        dispatchFormat = 'ai_reel';
      }

      const enableMultiTitles = matchingRule ? matchingRule.enableMultiTitle !== false : true;
      const addFirstComment = matchingRule ? (matchingRule.linkInComment ?? true) : true;
      let isDraftMode = matchingRule?.postStatus === 'draft' || matchingRule?.publishingMode === 'draft';
      if (payload.test === true || payload.is_test === true || payload.draft === true || payload.status === 'draft') {
        isDraftMode = true;
      }
      const isDripQueueMode =
        !isDraftMode &&
        (matchingRule?.postStatus === 'drip_queue' || matchingRule?.publishingMode === 'drip_queue');

      const expectedPostType: 'image' | 'video' | 'link' | 'text' =
        dispatchFormat === 'ai_reel'
          ? 'video'
          : dispatchFormat === 'link_card'
          ? 'link'
          : dispatchFormat === 'text_only'
          ? 'text'
          : 'image';

      // Per-(pageId + postType) duplicate check so Reel rule on same page isn't blocked by Image rule,
      // while duplicate webhooks for same article + format + page ARE strictly skipped!
      const targetPages = job.pages.filter((pg) => {
        const reqKey = `${pg.id}|${expectedPostType}`;
        if (inRequestProcessedKeys.has(reqKey)) return false;

        const alreadyExists = allPosts.some((existing) => {
          const sharesPage = Array.isArray(existing.pageIds) && existing.pageIds.includes(pg.id);
          if (!sharesPage) return false;
          // Separate video reels vs static image posts so both automations can coexist cleanly!
          const sameMediaKind = (existing.postType || 'image') === expectedPostType;
          if (!sameMediaKind) return false;

          const existingTitle = (existing.title || '').trim().toLowerCase();
          const existingLink = (existing.linkUrl || existing.commentText || '').toLowerCase();
          const linkMatch = candidateLink && candidateLink.length > 10 && existingLink.includes(candidateLink);
          const titleMatch =
            normalizedNewTitle &&
            existingTitle &&
            (existingTitle === normalizedNewTitle ||
              (normalizedNewTitle.length > 20 && existingTitle.startsWith(normalizedNewTitle.slice(0, 30))));

          if (linkMatch || titleMatch) {
            const createdMs = new Date(existing.createdAt).getTime();
            if (!isNaN(createdMs) && Date.now() - createdMs < 48 * 60 * 60 * 1000) {
              return true;
            }
          }
          return false;
        });

        if (!alreadyExists) {
          inRequestProcessedKeys.add(reqKey);
          return true;
        }
        return false;
      });

      if (targetPages.length === 0) {
        console.log(`[WP Webhook] Skipping rule "${matchedRuleName}" (${expectedPostType}): already ingested recently for all target pages.`);
        continue;
      }

      matchedRuleNames.push(matchedRuleName);
      lastDispatchFormat = dispatchFormat;
      lastIsDraftMode = isDraftMode;
      lastIsDripQueueMode = isDripQueueMode;
      lastAddFirstComment = addFirstComment;
      totalAssignedPages += targetPages.length;

      // Resolve template strictly from the matching library (Reel Studio vs Image Generator)
      const templatePool = dispatchFormat === 'ai_reel' ? allReelTemplates : allSigTemplates;
      const fallbackPool = dispatchFormat === 'ai_reel' ? INITIAL_REEL_TEMPLATES : INITIAL_SIG_TEMPLATES;
      let templateToUse =
        templatePool.find((t) => t.id === selectedSigTemplateId) ||
        templatePool.find((t) => t.isDefault && t.templateImageUrl) ||
        templatePool.find((t) => t.templateImageUrl && t.templateImageUrl.includes('media_')) ||
        templatePool.find((t) => t.isDefault) ||
        templatePool[0] ||
        fallbackPool.find((t) => t.isDefault) ||
        fallbackPool[0];

      // Only apply 4:5 fallback frame for ai_image or stale unsplash URLs; keep empty dark background intact for pure Reel layouts
      if (
        (dispatchFormat !== 'ai_reel' && !templateToUse.templateImageUrl) ||
        (templateToUse.templateImageUrl && templateToUse.templateImageUrl.includes('unsplash.com'))
      ) {
        const defaultFrame = '/uploads/media_8c7a84d712a33674.png';
        if (fs.existsSync(path.join(process.cwd(), 'public', 'uploads', 'media_8c7a84d712a33674.png'))) {
          templateToUse = {
            ...templateToUse,
            templateImageUrl: defaultFrame,
          };
        }
      }

      const isMultiTitleActive = enableMultiTitles && totalTitlesProvided > 0;
      const effectiveCaptionStyle =
        matchingRule?.captionStyle ||
        userSettings.automationCaptionStyle ||
        'title_char_limit';
      const effectiveCharLimit =
        matchingRule?.titleCharLimit ||
        userSettings.automationTitleCharLimit ||
        80;
      const effectiveSeeMoreText = (
        matchingRule?.seeMoreText ||
        userSettings.automationSeeMoreText ||
        '...See more'
      )
        .replace(/^[\s\u00A0\u200B]+/, '')
        .replace(/^(\.{2,}|…)[\s\u00A0\u200B]+/, '$1');
      const effectiveLinkPlacement =
        matchingRule?.linkPlacement ||
        userSettings.automationLinkPlacement ||
        (addFirstComment ? 'first_comment' : 'in_caption');
      const effectiveCommentTemplate =
        matchingRule?.commentTemplate ||
        userSettings.automationCommentTemplate ||
        '👉 पूरी खबर यहाँ पढ़ें: {link}';

      const intervalMinSeconds =
        matchingRule?.pageIntervalMinSeconds ??
        userSettings.automationPageIntervalMinSeconds ??
        userSettings.pageIntervalMinSeconds ??
        0;
      const intervalMaxSeconds =
        matchingRule?.pageIntervalMaxSeconds ??
        userSettings.automationPageIntervalMaxSeconds ??
        userSettings.pageIntervalMaxSeconds ??
        0;

      const pagePostsToPersist: Post[] = [];
      let cumulativeDelayMs = 0;
      let firstGeneratedCardUrl: string | undefined = undefined;
      let firstGeneratedReelUrl: string | undefined = undefined;
      const generatedCardsByTitle = new Map<string, string>();
      const generatedReelsByTitle = new Map<string, string>();
      const isSingleTitleMode = !isMultiTitleActive || totalTitlesProvided <= 1;

      // Loop through each target page and dispatch 1-to-1 according to selected format
      for (let i = 0; i < targetPages.length; i++) {
        const page = targetPages[i];

      // Resolve Title and Subtitle for this specific page
      let assignedTitle = mainTitle;
      let assignedSubtitle: string | undefined = undefined;
      let hasCustomTitle = false;
      let isFallbackDefaultImage = false;

      if (isSingleTitleMode) {
        // Single title mode or single title provided: all target pages share the exact same title & image!
        assignedTitle = mainTitle;
        assignedSubtitle = payload.subtitle || payload.main_subtitle || undefined;
        hasCustomTitle = i === 0;
        isFallbackDefaultImage = i > 0;
      } else if (isMultiTitleActive) {
        // Priority 1: Match by pageId or page.name in availableTitleVariations
        const matchedVar = availableTitleVariations.find(
          (v) =>
            v &&
            ((v.pageId && (v.pageId === page.id || v.pageId === page.pageId)) ||
             (v.pageName && v.pageName.trim().toLowerCase() === page.name.trim().toLowerCase()))
        );

        if (matchedVar && matchedVar.title && matchedVar.title.trim()) {
          assignedTitle = matchedVar.title.trim();
          assignedSubtitle = matchedVar.subtitle?.trim() || undefined;
          hasCustomTitle = true;
        } else if (i < availableTitleVariations.length && availableTitleVariations[i]?.title?.trim()) {
          // Priority 2: 1-to-1 sequential matching (Page 1 -> Title 1, Page 2 -> Title 2, Page 3 -> Title 3)
          assignedTitle = availableTitleVariations[i].title.trim();
          assignedSubtitle = availableTitleVariations[i].subtitle?.trim() || undefined;
          hasCustomTitle = true;
        } else {
          // Priority 3: TITLES HAVE RUN OUT FOR THIS PAGE!
          // (e.g. 4 pages selected, but only 2 or 3 titles given)
          // As required by user:
          // "Fallback me raw photo nahi jayegi, balki Selected Page 1 par jo Image 1 (default title image) bani hai wahi Image 1 is page par jayegi!"
          assignedTitle = availableTitleVariations[0]?.title?.trim() || mainTitle;
          assignedSubtitle = availableTitleVariations[0]?.subtitle?.trim() || undefined;
          hasCustomTitle = false;
          isFallbackDefaultImage = true;
        }
      } else {
        // Single title mode or multi-title disabled:
        assignedTitle = mainTitle;
        assignedSubtitle = payload.subtitle || payload.main_subtitle || undefined;
        hasCustomTitle = true;
      }

      // Format caption and comment according to automation rules
      const formatted = formatAutomationCaption({
        title: assignedTitle,
        subtitle: assignedSubtitle,
        excerpt,
        permalink,
        captionStyle: effectiveCaptionStyle,
        charLimit: effectiveCharLimit,
        seeMoreText: effectiveSeeMoreText,
        linkPlacement: effectiveLinkPlacement,
        commentTemplate: effectiveCommentTemplate,
      });

      const message = formatted.caption;
      const commentText = formatted.commentText;

      let postTypeToSend: 'image' | 'link' | 'text' | 'video' = 'image';
      let mediaToSend: string = '';
      let linkToSend: string = '';

      const titleKey = `${assignedTitle.trim().toLowerCase()}|${(assignedSubtitle || '').trim().toLowerCase()}`;

      if (dispatchFormat === 'link_card') {
        postTypeToSend = 'link';
        linkToSend = permalink;
      } else if (dispatchFormat === 'text_only') {
        postTypeToSend = 'text';
        linkToSend = effectiveLinkPlacement === 'first_comment' ? '' : permalink;
      } else if (dispatchFormat === 'featured_image') {
        postTypeToSend = imageUrl ? 'image' : 'text';
        mediaToSend = imageUrl || '';
        linkToSend = effectiveLinkPlacement === 'first_comment' ? '' : permalink;
      } else if (dispatchFormat === 'ai_reel') {
        // AI Video Reel (9:16 Video with motion effects and background music)
        postTypeToSend = 'video';
        linkToSend = effectiveLinkPlacement === 'first_comment' ? '' : permalink;

        // Check if reel already generated for this title or single-title fallback
        if (isSingleTitleMode && firstGeneratedReelUrl) {
          mediaToSend = firstGeneratedReelUrl;
        } else if (generatedReelsByTitle.has(titleKey)) {
          mediaToSend = generatedReelsByTitle.get(titleKey)!;
        } else if (isFallbackDefaultImage && firstGeneratedReelUrl) {
          mediaToSend = firstGeneratedReelUrl;
        } else {
          try {
            const [cardBase64, frameLayerBase64] = await Promise.all([
              generateServerCardImage({
                headline: assignedTitle,
                subtitle: assignedSubtitle,
                featuredImageUrl: imageUrl || undefined,
                template: templateToUse,
                category: categories[0] || 'News',
                siteName: payload.site_name || incomingSiteUrl || '',
              }),
              imageUrl
                ? generateServerCardFrameLayer({
                    headline: assignedTitle,
                    subtitle: assignedSubtitle,
                    featuredImageUrl: imageUrl || undefined,
                    template: templateToUse,
                    category: categories[0] || 'News',
                    siteName: payload.site_name || incomingSiteUrl || '',
                  }).catch(() => undefined)
                : Promise.resolve(undefined),
            ]);
            const staticCardUrl = offloadBase64Media(cardBase64) || cardBase64;
            if (!firstGeneratedCardUrl) {
              firstGeneratedCardUrl = staticCardUrl;
            }
            generatedCardsByTitle.set(titleKey, staticCardUrl);

            const vConfig = templateToUse.videoConfig;
            const reelRes = await generateServerVideoReel({
              imageBase64: cardBase64,
              featuredImageUrl: imageUrl || undefined,
              frameOverlayBase64: frameLayerBase64,
              layerMode: templateToUse.layerMode || 'overlay',
              backgroundColor: templateToUse.backgroundColor || '#0B0F19',
              featuredImageBox: templateToUse.featuredImageBox,
              canvasWidth: templateToUse.canvasWidth || 1080,
              canvasHeight: templateToUse.canvasHeight || 1920,
              durationSeconds: vConfig?.durationSeconds || 15,
              effect: vConfig?.effect || 'subtle_float',
              effects: vConfig?.effects || (vConfig?.effect ? [vConfig.effect] : ['subtle_float']),
              effectDurationSeconds: vConfig?.effectDurationSeconds || vConfig?.durationSeconds || 15,
              motionIntensity: vConfig?.motionIntensity ?? 20,
              overlays: vConfig?.overlays || [],
              overlayIntensity: vConfig?.overlayIntensity ?? 50,
              musicUrl: vConfig?.musicUrl,
              musicVolume: vConfig?.musicVolume ?? 100,
            });
            mediaToSend = reelRes.videoUrl;
            if (!firstGeneratedReelUrl) {
              firstGeneratedReelUrl = reelRes.videoUrl;
            }
            generatedReelsByTitle.set(titleKey, reelRes.videoUrl);
            console.log(`[WP Webhook] Video Reel generated for Page ${page.name}: ${reelRes.videoUrl}`);
          } catch (reelErr) {
            console.error('[WP Webhook] Reel generation error, fallback to card image:', reelErr);
            postTypeToSend = 'image';
            mediaToSend = firstGeneratedCardUrl || imageUrl;
          }
        }
      } else {
        // dispatchFormat === 'ai_image' (Canvas branded card with bold headline overlay)
        postTypeToSend = 'image';
        linkToSend = effectiveLinkPlacement === 'first_comment' ? '' : permalink;

        // Check if card already generated for this title or single-title fallback
        if (isSingleTitleMode && firstGeneratedCardUrl) {
          mediaToSend = firstGeneratedCardUrl;
        } else if (generatedCardsByTitle.has(titleKey)) {
          mediaToSend = generatedCardsByTitle.get(titleKey)!;
        } else if (isFallbackDefaultImage && firstGeneratedCardUrl) {
          mediaToSend = firstGeneratedCardUrl;
        } else {
          try {
            const cardBase64 = await generateServerCardImage({
              headline: assignedTitle,
              subtitle: assignedSubtitle,
              featuredImageUrl: imageUrl || undefined,
              template: templateToUse,
              category: categories[0] || 'News',
              siteName: payload.site_name || incomingSiteUrl || '',
            });
            const staticCardUrl = offloadBase64Media(cardBase64) || cardBase64;
            mediaToSend = staticCardUrl;
            if (!firstGeneratedCardUrl) {
              firstGeneratedCardUrl = staticCardUrl;
            }
            generatedCardsByTitle.set(titleKey, staticCardUrl);
          } catch (cardErr) {
            console.error('[WP Webhook] Server Card generation error with template:', cardErr);
            // High-reliability fallback: try generating with safe layout so Facebook NEVER gets just a bare photo
            try {
              const fallbackCard = await generateServerCardImage({
                headline: assignedTitle,
                subtitle: assignedSubtitle,
                featuredImageUrl: imageUrl || undefined,
                template: {
                  id: 'tmpl_safe_fallback',
                  name: 'Safe Fallback News Card',
                  canvasWidth: 1080,
                  canvasHeight: 1350,
                  templateImageUrl: '/uploads/media_8c7a84d712a33674.png',
                  layerMode: 'overlay',
                  featuredImageBox: { x: 0, y: 462, width: 1080, height: 784, borderRadius: 12 },
                  titleBox: {
                    x: 95,
                    y: 76,
                    width: 858,
                    height: 310,
                    fontSize: 48,
                    lineHeight: 1.35,
                    textColor: '#FFFFFF',
                    highlightColor: '#FBBF24',
                    fontFamily: 'Noto Sans Devanagari',
                    alignment: 'center',
                  },
                  isDefault: true,
                },
                category: categories[0] || 'News',
                siteName: payload.site_name || incomingSiteUrl || '',
              });
              const staticFallback = offloadBase64Media(fallbackCard) || fallbackCard;
              mediaToSend = staticFallback;
              if (!firstGeneratedCardUrl) {
                firstGeneratedCardUrl = staticFallback;
              }
              generatedCardsByTitle.set(titleKey, staticFallback);
            } catch (retryErr) {
              console.error('[WP Webhook] Secondary card fallback also failed, using raw imageUrl:', retryErr);
              mediaToSend = imageUrl;
            }
          }
        }
      }

      if (!firstGeneratedCardUrl && mediaToSend) {
        firstGeneratedCardUrl = mediaToSend;
      }

      // If Draft Mode is enabled for this automation rule:
      // Do NOT dispatch live to Facebook! Queue as draft in results.
      if (isDraftMode) {
        const draftPost: Post = {
          id: `post_wp_draft_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: 'ws_default',
          postType: postTypeToSend,
          title: assignedTitle,
          message,
          mediaUrl: mediaToSend || undefined,
          thumbnailUrl: mediaToSend || imageUrl || undefined,
          featuredImageUrl: imageUrl || undefined,
          isAiGenerated: dispatchFormat === 'ai_image' || dispatchFormat === 'ai_reel',
          sigTemplateId: selectedSigTemplateId || templateToUse?.id,
          linkUrl: linkToSend || undefined,
          commentText: commentText || undefined,
          pageIds: [page.id], // Strictly isolated to this page!
          status: 'draft',
          results: [
            {
              pageId: page.id,
              platform: page.platform as any,
              pageName: page.name,
              status: 'draft',
              titleUsed: assignedTitle,
              subtitleUsed: assignedSubtitle,
              mediaUrl: mediaToSend,
              timestamp: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        pagePostsToPersist.push(draftPost);
        dispatchResults.push({
          pageId: page.id,
          pageName: page.name,
          platform: page.platform,
          titleUsed: assignedTitle,
          subtitleUsed: assignedSubtitle,
          titleIndex: i + 1,
          isUniqueVariation: !isFallbackDefaultImage,
          isFallbackDefaultImage,
          mediaUrl: mediaToSend,
          status: 'draft',
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // ── SMART DRIP QUEUE MODE ──
      // Dynamic rolling interval (e.g. 27–33 min random gap) with Night Sleep active hours protection
      if (isDripQueueMode) {
        const slotInfo = calculateNextDripSlot({
          existingPosts: [...allPosts, ...allPostsToPersist, ...pagePostsToPersist],
          targetPageIds: [page.id],
          minMinutes: matchingRule?.dripIntervalMinMinutes ?? 27,
          maxMinutes: matchingRule?.dripIntervalMaxMinutes ?? 33,
          enableNightSleep: matchingRule?.enableNightSleep !== false,
          activeHoursStart: matchingRule?.activeHoursStart || '07:00',
          activeHoursEnd: matchingRule?.activeHoursEnd || '23:00',
        });

        // If multi-page staggering is configured (i > 0), stagger across pages
        let finalSlotTime = slotInfo.scheduledAt;
        if (i > 0 && intervalMaxSeconds > 0) {
          const randDelaySec =
            Math.floor(
              Math.random() * (Math.max(intervalMinSeconds, intervalMaxSeconds) - intervalMinSeconds + 1)
            ) + intervalMinSeconds;
          finalSlotTime = new Date(finalSlotTime.getTime() + randDelaySec * 1000);
        }

        const scheduledAtIso = finalSlotTime.toISOString();

        const dripPost: Post = {
          id: `post_wp_drip_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: 'ws_default',
          postType: postTypeToSend,
          title: assignedTitle,
          message,
          mediaUrl: mediaToSend || undefined,
          thumbnailUrl: mediaToSend || imageUrl || undefined,
          featuredImageUrl: imageUrl || undefined,
          isAiGenerated: dispatchFormat === 'ai_image' || dispatchFormat === 'ai_reel',
          sigTemplateId: selectedSigTemplateId || templateToUse?.id,
          linkUrl: linkToSend || undefined,
          commentText: commentText || undefined,
          pageIds: [page.id], // Strictly isolated to this page!
          status: 'scheduled',
          scheduledAt: scheduledAtIso,
          intervalMinSeconds: (matchingRule?.dripIntervalMinMinutes ?? 27) * 60,
          intervalMaxSeconds: (matchingRule?.dripIntervalMaxMinutes ?? 33) * 60,
          results: [
            {
              pageId: page.id,
              platform: page.platform as any,
              pageName: page.name,
              status: 'scheduled',
              titleUsed: assignedTitle,
              subtitleUsed: assignedSubtitle,
              mediaUrl: mediaToSend,
              timestamp: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        pagePostsToPersist.push(dripPost);
        dispatchResults.push({
          pageId: page.id,
          pageName: page.name,
          platform: page.platform,
          titleUsed: assignedTitle,
          subtitleUsed: assignedSubtitle,
          titleIndex: i + 1,
          isUniqueVariation: !isFallbackDefaultImage,
          isFallbackDefaultImage,
          mediaUrl: mediaToSend,
          status: 'scheduled',
          scheduledAt: scheduledAtIso,
          dripIntervalMinutes: slotInfo.intervalMinutes,
          shiftedForNight: slotInfo.shiftedForNight,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // MULTI-PAGE STAGGERED INTERVAL:
      // If i > 0 and intervalMaxSeconds > 0, schedule this page in MySQL queue rather than immediate synchronous dispatch
      if (i > 0 && intervalMaxSeconds > 0) {
        const randDelaySec =
          Math.floor(
            Math.random() * (Math.max(intervalMinSeconds, intervalMaxSeconds) - intervalMinSeconds + 1)
          ) + intervalMinSeconds;
        cumulativeDelayMs += randDelaySec * 1000;
        const scheduledAtIso = new Date(Date.now() + cumulativeDelayMs).toISOString();

        const staggerPost: Post = {
          id: `post_wp_stagger_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: 'ws_default',
          postType: postTypeToSend,
          title: assignedTitle,
          message,
          mediaUrl: mediaToSend || undefined,
          thumbnailUrl: mediaToSend || imageUrl || undefined,
          featuredImageUrl: imageUrl || undefined,
          isAiGenerated: dispatchFormat === 'ai_image' || dispatchFormat === 'ai_reel',
          sigTemplateId: selectedSigTemplateId || templateToUse?.id,
          linkUrl: linkToSend || undefined,
          commentText: commentText || undefined,
          pageIds: [page.id], // Strictly isolated to this page!
          status: 'scheduled',
          scheduledAt: scheduledAtIso,
          intervalMinSeconds,
          intervalMaxSeconds,
          results: [
            {
              pageId: page.id,
              platform: page.platform as any,
              pageName: page.name,
              status: 'scheduled',
              titleUsed: assignedTitle,
              subtitleUsed: assignedSubtitle,
              mediaUrl: mediaToSend,
              timestamp: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        pagePostsToPersist.push(staggerPost);
        dispatchResults.push({
          pageId: page.id,
          pageName: page.name,
          platform: page.platform,
          titleUsed: assignedTitle,
          subtitleUsed: assignedSubtitle,
          mediaUrl: mediaToSend,
          titleIndex: i + 1,
          status: 'scheduled',
          scheduledAt: scheduledAtIso,
          staggerDelaySeconds: Math.round(cumulativeDelayMs / 1000),
          isUniqueVariation: !isFallbackDefaultImage,
          isFallbackDefaultImage,
        });
        continue;
      }

      // Otherwise, dispatch live to Facebook (Page 0 or simultaneous mode)
      const targetItem: PublishTarget = {
        id: page.id,
        platform: page.platform,
        name: page.name,
        pageId: page.pageId,
        accessToken: page.accessToken,
        botToken: page.botToken,
        chatId: page.chatId,
        siteUrl: page.siteUrl,
        category: page.category,
      };

      try {
        const singleResult = await dispatchToTargets({
          postType: postTypeToSend,
          title: assignedTitle,
          message,
          mediaUrl: mediaToSend,
          linkUrl: linkToSend,
          commentText,
          isAiGenerated: dispatchFormat === 'ai_image',
          targets: [targetItem],
        });

        const res0 = singleResult?.[0];
        const pageStatus = res0?.status === 'success' ? 'published' : 'failed';

        const livePost: Post = {
          id: `post_wp_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: 'ws_default',
          postType: postTypeToSend,
          title: assignedTitle,
          message,
          mediaUrl: mediaToSend || undefined,
          thumbnailUrl: mediaToSend || imageUrl || undefined,
          featuredImageUrl: imageUrl || undefined,
          isAiGenerated: dispatchFormat === 'ai_image' || dispatchFormat === 'ai_reel',
          sigTemplateId: selectedSigTemplateId || templateToUse?.id,
          linkUrl: linkToSend || undefined,
          commentText: commentText || undefined,
          pageIds: [page.id], // Strictly isolated to this page!
          status: pageStatus,
          publishedAt: new Date().toISOString(),
          results: [
            {
              pageId: page.id,
              platform: (page.platform || 'facebook') as any,
              pageName: page.name,
              status: pageStatus === 'published' ? 'success' : 'failed',
              titleUsed: assignedTitle,
              subtitleUsed: assignedSubtitle,
              mediaUrl: mediaToSend,
              externalPostId: res0?.externalPostId,
              postUrl: res0?.postUrl,
              commentId: res0?.commentId,
              commentStatus: res0?.commentStatus,
              error: res0?.error,
              timestamp: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        pagePostsToPersist.push(livePost);

        dispatchResults.push({
          ...(res0 || {}),
          pageId: page.id,
          pageName: page.name,
          platform: page.platform,
          titleUsed: assignedTitle,
          subtitleUsed: assignedSubtitle,
          mediaUrl: mediaToSend,
          titleIndex: i + 1,
          isUniqueVariation: !isFallbackDefaultImage,
          isFallbackDefaultImage,
        });
      } catch (dispErr: unknown) {
        const errMsg = dispErr instanceof Error ? dispErr.message : 'Dispatch failed';
        const failedPost: Post = {
          id: `post_wp_fail_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: 'ws_default',
          postType: postTypeToSend,
          title: assignedTitle,
          message,
          mediaUrl: mediaToSend || undefined,
          thumbnailUrl: mediaToSend || imageUrl || undefined,
          featuredImageUrl: imageUrl || undefined,
          isAiGenerated: dispatchFormat === 'ai_image' || dispatchFormat === 'ai_reel',
          sigTemplateId: selectedSigTemplateId || templateToUse?.id,
          linkUrl: linkToSend || undefined,
          commentText: commentText || undefined,
          pageIds: [page.id],
          status: 'failed',
          results: [
            {
              pageId: page.id,
              platform: (page.platform || 'facebook') as any,
              pageName: page.name,
              status: 'failed',
              titleUsed: assignedTitle,
              subtitleUsed: assignedSubtitle,
              mediaUrl: mediaToSend,
              error: errMsg,
              timestamp: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        pagePostsToPersist.push(failedPost);
        dispatchResults.push({
          pageId: page.id,
          pageName: page.name,
          platform: page.platform,
          titleUsed: assignedTitle,
          subtitleUsed: assignedSubtitle,
          mediaUrl: mediaToSend,
          status: 'failed',
          error: errMsg,
          isUniqueVariation: !isFallbackDefaultImage,
          isFallbackDefaultImage,
          timestamp: new Date().toISOString(),
        });
      }
      }

      if (pagePostsToPersist.length > 0) {
        allPostsToPersist.push(...pagePostsToPersist);
      }
    }

    if (matchedRuleNames.length === 0) {
      return NextResponse.json({
        success: true,
        dispatched: false,
        skipped: true,
        reason: 'duplicate_article_recently_ingested',
        message: `Post "${mainTitle}" was skipped because an identical article is already queued or published for all matching rules.`,
      });
    }

    // 4. Save to Posts History (Post Library)
    await persistPosts(allPostsToPersist, resolvedEmail);

    const combinedRuleNames = matchedRuleNames.join(', ');

    return NextResponse.json({
      success: true,
      dispatched: !lastIsDraftMode && !lastIsDripQueueMode,
      isDraft: lastIsDraftMode,
      isDripQueue: lastIsDripQueueMode,
      ruleMatched: combinedRuleNames,
      dispatchFormat: lastDispatchFormat,
      message: lastIsDraftMode
        ? `Ingested and saved as Draft in Post Library (${combinedRuleNames}).`
        : lastIsDripQueueMode
        ? `Ingested & queued into Smart Drip Schedule (${dispatchResults[0]?.dripIntervalMinutes || 30}m interval) for ${totalAssignedPages} target page dispatches (${combinedRuleNames}).`
        : `Ingested & dispatched to ${totalAssignedPages} target page dispatches (${combinedRuleNames}).`,
      mainTitle,
      totalVariations: Math.max(1, incomingVariations.length, rawSocialTitles.length),
      assignedPagesCount: totalAssignedPages,
      firstCommentEnabled: lastAddFirstComment,
      dispatchedCount: dispatchResults.filter((r) => r.status === 'success').length,
      queuedCount: dispatchResults.filter((r) => r.status === 'scheduled').length,
      results: dispatchResults,
      queuedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
