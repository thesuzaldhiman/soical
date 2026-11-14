import { NextRequest, NextResponse } from 'next/server';
import { dispatchToTargets, PublishTarget } from '@/lib/services/publisher';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { DEMO_CATEGORIES, DEMO_PAGES } from '@/lib/state/mock-data';
import { AutomationFeed, PageCategory, Post, SocialPage } from '@/types';
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
      'SELECT posts FROM app_user_data WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (rows && rows.length > 0) {
      const existingPosts = parseJsonSafe(rows[0].posts, []);
      const updatedPosts = [...newPosts, ...existingPosts].slice(0, 300);
      await pool.query(
        'UPDATE app_user_data SET posts = ?, updated_at = NOW() WHERE email = ?',
        [JSON.stringify(updatedPosts), cleanEmail]
      );
    }
  } catch (err) {
    console.warn('[WP Webhook] Failed persisting posts to MySQL:', err);
  }
}

async function getUserState(email: string = 'suzaldhiman@gmail.com') {
  const cleanEmail = email.toLowerCase().trim();
  const pool = getDbPool();
  if (!pool) {
    return {
      pages: DEMO_PAGES,
      categories: DEMO_CATEGORIES,
      automations: [] as AutomationFeed[],
      posts: getLocalPosts(),
    };
  }

  try {
    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT pages, categories, posts, automations FROM app_user_data WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (rows && rows.length > 0) {
      const row = rows[0];
      const parsedPages = parseJsonSafe(row.pages, DEMO_PAGES) as SocialPage[];
      const parsedCats = parseJsonSafe(row.categories, DEMO_CATEGORIES) as PageCategory[];
      const parsedAutos = parseJsonSafe(row.automations, []) as AutomationFeed[];
      return {
        pages: parsedPages.length > 0 ? parsedPages : DEMO_PAGES,
        categories: parsedCats.length > 0 ? parsedCats : DEMO_CATEGORIES,
        automations: parsedAutos,
        posts: parseJsonSafe(row.posts, getLocalPosts()) as Post[],
      };
    }
  } catch (err) {
    console.warn('[WP Webhook] Database read error, using fallback:', err);
  }

  return {
    pages: DEMO_PAGES,
    categories: DEMO_CATEGORIES,
    automations: [] as AutomationFeed[],
    posts: getLocalPosts(),
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
    const imageUrl = (payload.image_url || payload.featured_image || '').trim();
    const excerpt = (payload.excerpt || '').trim();
    const categories: string[] = Array.isArray(payload.categories)
      ? payload.categories
      : payload.category
      ? [payload.category]
      : [];

    // 1. Fetch user pages, categories & automations
    const userState = await getUserState();
    const allPages: SocialPage[] = userState.pages || [];
    const allCategories: PageCategory[] = userState.categories || [];
    const allAutomations: AutomationFeed[] = (userState as any).automations || [];

    const incomingSiteUrl = (payload.site_url || '').trim().replace(/\/+$/, '').toLowerCase();
    const postCategories = categories.map((c: string) => c.toLowerCase().trim());

    // 2. Resolve Automation Rule & Target Pages
    let targetPages: SocialPage[] = [];
    let dispatchFormat: 'ai_image' | 'featured_image' | 'link_card' | 'text_only' = 'ai_image';
    let enableMultiTitles = true;
    let addFirstComment = true;
    let matchedRuleName = '';

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

    // 3. Prepare Multi-Title Mapping
    // [Main Title (Page 1), Extra Title 1 (Page 2), Extra Title 2 (Page 3), Extra Title 3 (Page 4)]
    const allTitles = enableMultiTitles ? [mainTitle, ...socialTitles] : [mainTitle];
    const dispatchResults: any[] = [];
    const commentText = addFirstComment && permalink ? `👉 पूरी खबर यहाँ पढ़ें: ${permalink}` : '';

    // Loop through each target page and dispatch according to selected format
    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i];
      const assignedTitle = enableMultiTitles ? allTitles[i] || mainTitle : mainTitle;
      const message = `${assignedTitle}\n\n${excerpt}`.trim();

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

      let postTypeToSend: 'image' | 'link' | 'text' = 'image';
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
      } else {
        // ai_image (canvas/banner with title text)
        postTypeToSend = 'image';
        mediaToSend = imageUrl;
        linkToSend = permalink;
      }

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

    // 4. Save to Posts History
    const newPostRecord: Post = {
      id: `post_wp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: 'ws_default',
      postType: dispatchFormat === 'link_card' ? 'link' : dispatchFormat === 'text_only' ? 'text' : 'image',
      title: mainTitle,
      message: `${mainTitle}\n\n${excerpt}`.trim(),
      mediaUrl: (dispatchFormat === 'ai_image' || dispatchFormat === 'featured_image') ? imageUrl || undefined : undefined,
      thumbnailUrl: imageUrl || undefined,
      linkUrl: permalink || undefined,
      commentText: commentText || undefined,
      pageIds: targetPages.map((p) => p.id),
      status: dispatchResults.some((r) => r.status === 'success') ? 'published' : 'failed',
      scheduledAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
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

    await persistPosts([newPostRecord]);

    return NextResponse.json({
      success: true,
      dispatched: true,
      ruleMatched: matchedRuleName,
      dispatchFormat,
      message: `Ingested & dispatched to ${targetPages.length} pages (${matchedRuleName}) with ${allTitles.length} title variations.`,
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
