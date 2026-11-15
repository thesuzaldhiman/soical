import { NextRequest, NextResponse } from 'next/server';
import { dispatchToTargets, PublishTarget } from '@/lib/services/publisher';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { DEMO_CATEGORIES, DEMO_PAGES, INITIAL_SIG_TEMPLATES } from '@/lib/state/mock-data';
import { AutomationFeed, PageCategory, Post, SocialPage, SigTemplate } from '@/types';
import { generateServerCardImage } from '@/lib/services/server-image-generator';
import { generateServerVideoReel } from '@/lib/services/server-video-generator';
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

async function persistPosts(newPosts: Post[], email: string = 'suzaldhiman@gmail.com') {
  const localCurrent = getLocalPosts();
  saveLocalPosts([...newPosts, ...localCurrent]);

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
      const updatedPosts = [...newPosts, ...existingPosts].slice(0, 500);
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
    };
  }

  try {
    await initDbTables();
    const cleanSite = (siteUrl || '').trim().toLowerCase().replace(/\/+$/, '');

    // 1. If explicit email passed, use it directly
    if (explicitEmail) {
      const [rows] = await pool.query<any[]>(
        'SELECT email, pages, categories, posts, automations, sig_templates FROM app_user_data WHERE email = ? LIMIT 1',
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
        };
      }
    }

    // 2. Query all tenant users to find the owner of this site
    const [allUsers] = await pool.query<any[]>(
      'SELECT email, pages, categories, posts, automations, accounts, sig_templates FROM app_user_data'
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
            };
          }
        }
      }

      // Default to first registered user
      const first = allUsers[0];
      return {
        email: first.email,
        pages: parseJsonSafe(first.pages, DEMO_PAGES),
        categories: parseJsonSafe(first.categories, []),
        automations: parseJsonSafe(first.automations, []),
        posts: parseJsonSafe(first.posts, getLocalPosts()),
        sigTemplates: parseJsonSafe(first.sig_templates, INITIAL_SIG_TEMPLATES),
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
  };
}

export async function GET() {
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

    const mainTitle = (payload.main_title || payload.title || '').trim();
    if (!mainTitle) {
      return NextResponse.json({ error: 'Missing post title in payload' }, { status: 400 });
    }

    const socialTitles: string[] = Array.isArray(payload.social_titles)
      ? payload.social_titles.map((t: any) => String(t).trim()).filter(Boolean)
      : [];

    const permalink = (payload.permalink || '').trim();
    const incomingSiteUrl = (payload.site_url || '').trim().replace(/\/+$/, '').toLowerCase();
    const explicitEmail = (payload.user_email || payload.email || '').trim().toLowerCase();
    const excerpt = (payload.excerpt || '').trim();
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
    const allSigTemplates: SigTemplate[] = userState.sigTemplates || INITIAL_SIG_TEMPLATES;

    const postCategories = categories.map((c: string) => c.toLowerCase().trim());

    // 2. Resolve Automation Rule & Target Pages
    let targetPages: SocialPage[] = [];
    let dispatchFormat: 'ai_image' | 'featured_image' | 'link_card' | 'text_only' | 'ai_reel' | 'image_and_reel' = 'ai_image';
    let enableMultiTitles = true;
    let addFirstComment = true;
    let matchedRuleName = '';
    let isDraftMode = false;
    let selectedSigTemplateId: string | undefined = undefined;

    // A. Explicit targets passed directly in payload
    if (Array.isArray(payload.targets) && payload.targets.length > 0) {
      const explicitIds = new Set(payload.targets.map((t: any) => t.id || t.pageId));
      targetPages = allPages.filter((p) => explicitIds.has(p.id) || explicitIds.has(p.pageId));
      matchedRuleName = 'Explicit Target Payload';
    }

    // B. Check Website to FB Automation Rules
    if (targetPages.length === 0 && allAutomations.length > 0) {
      const matchingRule = allAutomations.find((rule) => {
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

      if (matchingRule) {
        matchedRuleName = matchingRule.name;
        dispatchFormat = matchingRule.format || (matchingRule.autoGenerateImage ? 'ai_image' : 'featured_image');
        enableMultiTitles = matchingRule.enableMultiTitle !== false;
        addFirstComment = matchingRule.linkInComment ?? true;
        isDraftMode = matchingRule.postStatus === 'draft';
        if (payload.test === true || payload.is_test === true || payload.draft === true || payload.status === 'draft') {
          isDraftMode = true;
        }
        selectedSigTemplateId = matchingRule.sigTemplateId;

        if (Array.isArray(matchingRule.targetPageIds) && matchingRule.targetPageIds.length > 0) {
          const rulePageIds = new Set(matchingRule.targetPageIds);
          targetPages = allPages.filter((p) => rulePageIds.has(p.id) || rulePageIds.has(p.pageId));
        } else if (matchingRule.targetCategoryId) {
          const catGroup = allCategories.find((c) => c.id === matchingRule.targetCategoryId);
          if (catGroup && catGroup.pageIds) {
            const catPageIds = new Set(catGroup.pageIds);
            targetPages = allPages.filter((p) => catPageIds.has(p.id) || catPageIds.has(p.pageId));
          }
        }
      }
    }

    // STRICT ANTI-SPAM PROTECTION:
    // If NO active Website to FB automation rule matched, STOP! DO NOT POST OR SAVE DRAFTS!
    if (targetPages.length === 0) {
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

    // Resolve template to use for AI Card Image generation
    const templateToUse =
      allSigTemplates.find((t) => t.id === selectedSigTemplateId) ||
      allSigTemplates.find((t) => t.isDefault) ||
      allSigTemplates[0] ||
      INITIAL_SIG_TEMPLATES[0];

    // 3. Prepare Multi-Title Mapping
    // [Main Title (Page 1), Extra Title 1 (Page 2), Extra Title 2 (Page 3), Extra Title 3 (Page 4)]
    const allTitles = enableMultiTitles ? [mainTitle, ...socialTitles] : [mainTitle];
    const dispatchResults: any[] = [];
    const commentText = addFirstComment && permalink ? `👉 पूरी खबर यहाँ पढ़ें: ${permalink}` : '';
    let firstGeneratedCardUrl: string | undefined = undefined;

    // Loop through each target page and dispatch according to selected format
    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i];
      const assignedTitle = enableMultiTitles ? allTitles[i] || mainTitle : mainTitle;
      const message = `${assignedTitle}\n\n${excerpt}`.trim();

      let postTypeToSend: 'image' | 'link' | 'text' | 'video' = 'image';
      let mediaToSend: string = '';
      let linkToSend: string = '';

      if (dispatchFormat === 'link_card') {
        postTypeToSend = 'link';
        linkToSend = permalink;
      } else if (dispatchFormat === 'text_only') {
        postTypeToSend = 'text';
        linkToSend = addFirstComment ? '' : permalink;
      } else if (dispatchFormat === 'featured_image') {
        postTypeToSend = imageUrl ? 'image' : 'text';
        mediaToSend = imageUrl;
        linkToSend = permalink;
      } else if (dispatchFormat === 'ai_reel') {
        // AI Video Reel (9:16 Video with motion effects and background music)
        postTypeToSend = 'video';
        linkToSend = permalink;

        try {
          const cardBase64 = await generateServerCardImage({
            headline: assignedTitle,
            featuredImageUrl: imageUrl || undefined,
            template: templateToUse,
            category: categories[0] || 'News',
            siteName: payload.site_name || incomingSiteUrl || '',
          });
          if (!firstGeneratedCardUrl) {
            firstGeneratedCardUrl = cardBase64;
          }

          const vConfig = templateToUse.videoConfig;
          const reelRes = await generateServerVideoReel({
            imageBase64: cardBase64,
            durationSeconds: vConfig?.durationSeconds || 15,
            effect: vConfig?.effect || 'shake',
            musicUrl: vConfig?.musicUrl,
          });
          mediaToSend = reelRes.videoUrl;
          console.log(`[WP Webhook] Video Reel generated for Page ${page.name}: ${reelRes.videoUrl}`);
        } catch (reelErr) {
          console.error('[WP Webhook] Reel generation error, fallback to card image:', reelErr);
          postTypeToSend = 'image';
          mediaToSend = firstGeneratedCardUrl || imageUrl;
        }
      } else {
        // dispatchFormat === 'ai_image' (Canvas branded card with bold headline overlay)
        postTypeToSend = 'image';
        linkToSend = permalink;

        try {
          const cardBase64 = await generateServerCardImage({
            headline: assignedTitle,
            featuredImageUrl: imageUrl || undefined,
            template: templateToUse,
            category: categories[0] || 'News',
            siteName: payload.site_name || incomingSiteUrl || '',
          });
          mediaToSend = cardBase64;
          if (!firstGeneratedCardUrl) {
            firstGeneratedCardUrl = cardBase64;
          }
        } catch (cardErr) {
          console.error('[WP Webhook] Server Card generation error:', cardErr);
          mediaToSend = imageUrl;
        }
      }

      if (!firstGeneratedCardUrl && mediaToSend) {
        firstGeneratedCardUrl = mediaToSend;
      }

      // If Draft Mode is enabled for this automation rule:
      // Do NOT dispatch live to Facebook! Queue as draft in results.
      if (isDraftMode) {
        dispatchResults.push({
          pageId: page.id,
          pageName: page.name,
          platform: page.platform,
          titleUsed: assignedTitle,
          titleIndex: i + 1,
          isUniqueVariation: i < allTitles.length,
          status: 'draft',
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Otherwise, dispatch live to Facebook
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

        if (singleResult && singleResult.length > 0) {
          const res0 = singleResult[0];
          dispatchResults.push({
            ...res0,
            pageId: page.id,
            pageName: page.name,
            platform: page.platform,
            titleUsed: assignedTitle,
            titleIndex: i + 1,
            isUniqueVariation: i < allTitles.length,
          });
        }
      } catch (dispErr: unknown) {
        const errMsg = dispErr instanceof Error ? dispErr.message : 'Dispatch failed';
        dispatchResults.push({
          pageId: page.id,
          pageName: page.name,
          platform: page.platform,
          titleUsed: assignedTitle,
          status: 'failed',
          error: errMsg,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 4. Save to Posts History (Post Library)
    const finalMedia = firstGeneratedCardUrl || (imageUrl || undefined);
    const postStatusValue: 'published' | 'draft' | 'failed' = isDraftMode
      ? 'draft'
      : dispatchResults.some((r) => r.status === 'success')
      ? 'published'
      : 'failed';

    const newPostRecord: Post = {
      id: `post_wp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: 'ws_default',
      postType: dispatchFormat === 'link_card' ? 'link' : dispatchFormat === 'text_only' ? 'text' : 'image',
      title: mainTitle,
      message: `${mainTitle}\n\n${excerpt}`.trim(),
      mediaUrl: finalMedia,
      thumbnailUrl: imageUrl || finalMedia || undefined,
      linkUrl: permalink || undefined,
      commentText: commentText || undefined,
      pageIds: targetPages.map((p) => p.id),
      status: postStatusValue,
      scheduledAt: new Date().toISOString(),
      publishedAt: isDraftMode ? undefined : new Date().toISOString(),
      results: dispatchResults.map((r) => ({
        pageId: r.pageId,
        platform: (r.platform || 'facebook') as any,
        pageName: r.pageName,
        status: r.status,
        externalPostId: r.externalPostId,
        postUrl: r.postUrl,
        error: r.error,
        timestamp: r.timestamp || new Date().toISOString(),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await persistPosts([newPostRecord], resolvedEmail);

    return NextResponse.json({
      success: true,
      dispatched: !isDraftMode,
      isDraft: isDraftMode,
      ruleMatched: matchedRuleName,
      dispatchFormat,
      message: isDraftMode
        ? `Ingested and saved as Draft in Post Library for review/schedule with AI Card image (${matchedRuleName}).`
        : `Ingested & dispatched to ${targetPages.length} pages (${matchedRuleName}) with ${allTitles.length} title variations.`,
      mainTitle,
      totalVariations: allTitles.length,
      assignedPagesCount: targetPages.length,
      firstCommentEnabled: !!commentText,
      dispatchedCount: dispatchResults.filter((r) => r.status === 'success').length,
      results: dispatchResults,
      queuedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
