import { NextRequest, NextResponse } from 'next/server';
import { dispatchToTargets, PublishTarget } from '@/lib/services/publisher';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { DEMO_CATEGORIES, DEMO_PAGES } from '@/lib/state/mock-data';
import { PageCategory, Post, SocialPage } from '@/types';
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
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(posts, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[WP Webhook] Failed saving local posts cache:', err);
  }
}

async function getUserState(email: string = 'suzaldhiman@gmail.com') {
  const cleanEmail = email.toLowerCase().trim();
  const pool = getDbPool();
  if (!pool) {
    return {
      pages: DEMO_PAGES,
      categories: DEMO_CATEGORIES,
      posts: getLocalPosts(),
    };
  }

  try {
    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT pages, categories, posts FROM app_user_data WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (rows && rows.length > 0) {
      const row = rows[0];
      const parsedPages = parseJsonSafe(row.pages, DEMO_PAGES) as SocialPage[];
      const parsedCats = parseJsonSafe(row.categories, DEMO_CATEGORIES) as PageCategory[];
      return {
        pages: parsedPages.length > 0 ? parsedPages : DEMO_PAGES,
        categories: parsedCats.length > 0 ? parsedCats : DEMO_CATEGORIES,
        posts: parseJsonSafe(row.posts, getLocalPosts()) as Post[],
      };
    }
  } catch (err) {
    console.warn('[WP Webhook] Database read error, using fallback:', err);
  }

  return {
    pages: DEMO_PAGES,
    categories: DEMO_CATEGORIES,
    posts: getLocalPosts(),
  };
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'Social Auto Poster WordPress Ingestion Engine',
    version: '2.0.0',
    capabilities: [
      'multi_title_per_page',
      'first_comment_link',
      'category_based_targeting',
      'instant_publish_hook'
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

    // 1. Fetch user pages & categories
    const userState = await getUserState();
    const allPages: SocialPage[] = userState.pages || [];
    const allCategories: PageCategory[] = userState.categories || [];

    // 2. Resolve Target Pages
    let targetPages: SocialPage[] = [];

    // If explicit targets provided in payload
    if (Array.isArray(payload.targets) && payload.targets.length > 0) {
      const explicitIds = new Set(payload.targets.map((t: any) => t.id || t.pageId));
      targetPages = allPages.filter((p) => explicitIds.has(p.id) || explicitIds.has(p.pageId));
    }

    // Otherwise, match against category
    if (targetPages.length === 0 && categories.length > 0) {
      const lowerCats = categories.map((c) => c.toLowerCase().trim());
      const matchedCat = allCategories.find((cat) => {
        const catNameLower = cat.name.toLowerCase();
        return lowerCats.some((lc) => catNameLower.includes(lc) || lc.includes(catNameLower));
      });

      if (matchedCat && matchedCat.pageIds && matchedCat.pageIds.length > 0) {
        const catPageIds = new Set(matchedCat.pageIds);
        targetPages = allPages.filter((p) => catPageIds.has(p.id) || catPageIds.has(p.pageId));
      }
    }

    // Fallback: If still no target pages, pick all active Facebook pages
    if (targetPages.length === 0) {
      targetPages = allPages.filter((p) => p.platform === 'facebook' && p.isActive !== false);
    }

    // If still empty, use all active pages regardless of platform
    if (targetPages.length === 0) {
      targetPages = allPages.filter((p) => p.isActive !== false);
    }

    // 3. Prepare Multi-Title Mapping
    // [Main Title (Page 1), Extra Title 1 (Page 2), Extra Title 2 (Page 3), Extra Title 3 (Page 4)]
    const allTitles = [mainTitle, ...socialTitles];

    const dispatchResults: any[] = [];
    const commentText = permalink ? `👉 पूरी खबर यहाँ पढ़ें: ${permalink}` : '';

    // Loop through each target page and dispatch with unique title
    for (let i = 0; i < targetPages.length; i++) {
      const page = targetPages[i];
      // Title for this page: either specific title or fallback to mainTitle
      const assignedTitle = allTitles[i] || mainTitle;
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

      try {
        const singleResult = await dispatchToTargets({
          postType: imageUrl ? 'image' : 'text',
          title: assignedTitle,
          message,
          mediaUrl: imageUrl,
          linkUrl: permalink,
          commentText,
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
      postType: imageUrl ? 'image' : 'text',
      title: mainTitle,
      message: `${mainTitle}\n\n${excerpt}`.trim(),
      mediaUrl: imageUrl || undefined,
      thumbnailUrl: imageUrl || undefined,
      linkUrl: permalink || undefined,
      commentText,
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

    const currentLocalPosts = getLocalPosts();
    saveLocalPosts([newPostRecord, ...currentLocalPosts]);

    return NextResponse.json({
      success: true,
      message: `Ingested & dispatched to ${targetPages.length} pages with ${allTitles.length} title variations.`,
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
