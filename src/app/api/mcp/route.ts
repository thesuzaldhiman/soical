import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { dispatchToTargets, PublishTarget } from '@/lib/services/publisher';
import { INITIAL_CATEGORIES, INITIAL_PAGES, DEMO_PAGES, DEMO_CATEGORIES } from '@/lib/state/mock-data';
import { PageCategory, Post, SocialPage } from '@/types';
import fs from 'fs';
import path from 'path';

const EXPECTED_SECRET = process.env.MCP_SECRET_KEY || 'sap_mcp_live_secret_99x8a7b6c5d4e3';

// Fallback local storage file for development / offline cache
const LOCAL_STORE_FILE = path.join(process.cwd(), 'src', 'lib', 'data', 'mcp-posts-cache.json');

function verifySecret(request: NextRequest): boolean {
  const searchParams = request.nextUrl.searchParams;
  const provided =
    searchParams.get('secret') ||
    searchParams.get('key') ||
    request.headers.get('x-mcp-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (process.env.NODE_ENV !== 'production' && !provided) {
    // In dev mode allow testing without secret if not provided
    return true;
  }
  return provided === EXPECTED_SECRET;
}

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
    console.warn('[MCP API] Failed saving local posts cache:', err);
  }
}

async function getUserState(email: string = 'suzaldhiman@gmail.com') {
  const cleanEmail = email.toLowerCase().trim();
  const pool = getDbPool();
  if (!pool) {
    return {
      source: 'local' as const,
      pages: [],
      categories: [],
      posts: getLocalPosts(),
      workspace: { id: `ws_${cleanEmail.replace(/[^a-z0-9_]/g, '_')}`, monthlyPostsUsed: 0 },
    };
  }

  try {
    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT email, workspace, pages, categories, posts FROM app_user_data WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (rows && rows.length > 0) {
      const row = rows[0];
      const parsedPages = parseJsonSafe(row.pages, []) as SocialPage[];
      const parsedCats = parseJsonSafe(row.categories, []) as PageCategory[];
      return {
        source: 'mysql' as const,
        pages: parsedPages,
        categories: parsedCats,
        posts: parseJsonSafe(row.posts, []) as Post[],
        workspace: parseJsonSafe(row.workspace, { id: 'ws_default', monthlyPostsUsed: 0 }),
      };
    }
  } catch (err) {
    console.warn('[MCP API] Database read error, using fallback:', err);
  }

  return {
    source: 'fallback' as const,
    pages: [],
    categories: [],
    posts: getLocalPosts(),
    workspace: { id: `ws_${cleanEmail.replace(/[^a-z0-9_]/g, '_')}`, monthlyPostsUsed: 0 },
  };
}

async function persistPosts(newPosts: Post[], email: string = 'suzaldhiman@gmail.com') {
  // Always update local cache
  const localCurrent = getLocalPosts();
  saveLocalPosts([...newPosts, ...localCurrent]);

  const pool = getDbPool();
  if (!pool) return;

  try {
    const cleanEmail = email.toLowerCase().trim();
    const [rows] = await pool.query<any[]>(
      'SELECT posts, workspace FROM app_user_data WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (rows && rows.length > 0) {
      const existingPosts = parseJsonSafe(rows[0].posts, []);
      const updatedPosts = [...newPosts, ...existingPosts];
      await pool.query(
        'UPDATE app_user_data SET posts = ?, updated_at = NOW() WHERE email = ?',
        [JSON.stringify(updatedPosts), cleanEmail]
      );
    } else {
      // Upsert record
      await pool.query(
        `INSERT INTO app_user_data (email, posts, updated_at) 
         VALUES (?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE posts = VALUES(posts), updated_at = NOW()`,
        [cleanEmail, JSON.stringify(newPosts)]
      );
    }
  } catch (err) {
    console.error('[MCP API] Failed to persist posts in MySQL:', err);
  }
}

// ==========================================
// GET HANDLER: Targets & Queue Discovery
// ==========================================
export async function GET(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ success: false, error: 'Forbidden. Invalid MCP secret.' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'targets';
  const email = searchParams.get('email') || 'suzaldhiman@gmail.com';

  const state = await getUserState(email);

  if (action === 'queue') {
    const now = Date.now();
    const scheduled = state.posts
      .filter((p) => p.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime());

    const published = state.posts.filter((p) => p.status === 'published');

    let nextAvailableSlot = new Date(now + 15 * 60000).toISOString();
    if (scheduled.length > 0) {
      const last = scheduled[scheduled.length - 1];
      if (last.scheduledAt) {
        nextAvailableSlot = new Date(new Date(last.scheduledAt).getTime() + 45 * 60000).toISOString();
      }
    }

    return NextResponse.json({
      success: true,
      action: 'queue',
      scheduledCount: scheduled.length,
      publishedCount: published.length,
      nextAvailableSlot,
      queue: scheduled.map((p) => ({
        id: p.id,
        title: p.title || p.message.slice(0, 50),
        postType: p.postType,
        targetPageIds: p.pageIds,
        scheduledAt: p.scheduledAt,
        hasMedia: !!p.mediaUrl,
        hasComment: !!p.commentText,
      })),
    });
  }

  // Action: Targets (Pages, WordPress sites, Categories)
  const wpSites = state.pages
    .filter((p) => p.platform === 'wordpress')
    .map((p) => ({
      id: p.id,
      name: p.name,
      siteUrl: p.siteUrl || p.targetUrl || '',
      category: p.category || 'General',
      bridgeType: p.bridgeType || 'rest-api',
      isActive: p.isActive !== false,
    }));

  const socialPages = state.pages
    .filter((p) => p.platform !== 'wordpress')
    .map((p) => ({
      id: p.id,
      name: p.name,
      platform: p.platform,
      category: p.category || 'General',
      isActive: p.isActive !== false,
    }));

  const enrichedCategories = state.categories.map((cat) => {
    const matchingPages = state.pages.filter((pg) => (cat.pageIds || []).includes(pg.id));
    return {
      id: cat.id,
      name: cat.name,
      color: cat.color,
      pageCount: matchingPages.length,
      pageIds: cat.pageIds,
      pages: matchingPages.map((pg) => ({
        id: pg.id,
        name: pg.name,
        platform: pg.platform,
      })),
      defaultTags: cat.tags || [],
    };
  });

  return NextResponse.json({
    success: true,
    action: 'targets',
    counts: {
      totalDestinations: state.pages.length,
      wordpressSites: wpSites.length,
      socialPages: socialPages.length,
      categories: enrichedCategories.length,
    },
    wordpressSites: wpSites,
    socialPages: socialPages,
    categories: enrichedCategories,
  });
}

// ==========================================
// POST HANDLER: Scheduling & Batch Engine
// ==========================================
export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ success: false, error: 'Forbidden. Invalid MCP secret.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      action = 'schedule',
      email = 'suzaldhiman@gmail.com',
      // Target Selection Options
      targetMode = 'all', // 'wordpress_only' | 'social_only' | 'all'
      targetPageIds = [],
      targetCategoryNames = [],
      targetCategoryIds = [],
      // Interval / Time Window Options
      startDate, // 'YYYY-MM-DD'
      startTime, // '10:00' or ISO
      intervalMinutes = 45, // Minutes between posts
      jitterMinutes = 0, // Random noise (+/- minutes)
      // Posts Data
      posts = [],
      publishNow = false,
    } = body;

    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'The "posts" array is required and must contain at least one item.' },
        { status: 400 }
      );
    }

    const state = await getUserState(email);

    // 1. Resolve Target Page IDs
    const resolvedPageIdSet = new Set<string>();

    // Add direct page IDs
    if (Array.isArray(targetPageIds)) {
      targetPageIds.forEach((pid) => resolvedPageIdSet.add(pid));
    }

    // Add page IDs from category names
    if (Array.isArray(targetCategoryNames) && targetCategoryNames.length > 0) {
      const lowerNames = targetCategoryNames.map((n: string) => n.toLowerCase().trim());
      state.categories.forEach((cat) => {
        if (lowerNames.includes(cat.name.toLowerCase().trim())) {
          (cat.pageIds || []).forEach((pid) => resolvedPageIdSet.add(pid));
        }
      });
    }

    // Add page IDs from category IDs
    if (Array.isArray(targetCategoryIds) && targetCategoryIds.length > 0) {
      state.categories.forEach((cat) => {
        if (targetCategoryIds.includes(cat.id)) {
          (cat.pageIds || []).forEach((pid) => resolvedPageIdSet.add(pid));
        }
      });
    }

    // If no target specified at all, default to all active pages
    let finalTargetPages = state.pages.filter((pg) => {
      if (resolvedPageIdSet.size > 0) {
        return resolvedPageIdSet.has(pg.id);
      }
      return true;
    });

    // Apply targetMode filter
    if (targetMode === 'wordpress_only') {
      finalTargetPages = finalTargetPages.filter((pg) => pg.platform === 'wordpress');
    } else if (targetMode === 'social_only') {
      finalTargetPages = finalTargetPages.filter((pg) => pg.platform !== 'wordpress');
    }

    if (finalTargetPages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No matching destinations found for targetMode="${targetMode}" with provided criteria.`,
          availableDestinations: state.pages.map((p) => ({ id: p.id, name: p.name, platform: p.platform })),
        },
        { status: 400 }
      );
    }

    const finalPageIds = finalTargetPages.map((pg) => pg.id);

    // 2. Base Start Timestamp Calculation
    let currentSlotMs = Date.now() + 5 * 60000; // default 5 mins from now
    if (startDate && startTime) {
      const combo = `${startDate}T${startTime.length === 5 ? startTime + ':00' : startTime}`;
      const parsed = new Date(combo).getTime();
      if (!isNaN(parsed)) currentSlotMs = parsed;
    } else if (startTime) {
      const parsed = new Date(startTime).getTime();
      if (!isNaN(parsed)) currentSlotMs = parsed;
    }

    const createdPosts: Post[] = [];
    const nowIso = new Date().toISOString();

    // 3. Process and Build Each Post
    for (let i = 0; i < posts.length; i++) {
      const item = posts[i];

      // Item-level target overrides if specified
      let itemPageIds = finalPageIds;
      if (Array.isArray(item.pageIds) && item.pageIds.length > 0) {
        itemPageIds = item.pageIds;
      }

      // Calculate scheduled timestamp
      let postScheduledAt = item.scheduledAt;
      if (!postScheduledAt && !publishNow) {
        // Compute staggered interval time
        const jitter = jitterMinutes > 0 ? (Math.random() * jitterMinutes * 2 - jitterMinutes) * 60000 : 0;
        const targetMs = currentSlotMs + i * intervalMinutes * 60000 + jitter;
        postScheduledAt = new Date(targetMs).toISOString();
      }

      const postTitle = item.title || (item.message ? item.message.split('\n')[0] : 'Scheduled Post');
      const postMessage = item.message || item.title || '';
      const postHtml = item.contentHtml || (item.message ? item.message.replace(/\n/g, '<br/>') : '');

      const newPost: Post = {
        id: `pst_mcp_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
        workspaceId: state.workspace.id || 'ws_default',
        postType: item.postType || (item.mediaUrl ? 'image' : 'text'),
        title: postTitle,
        message: postMessage,
        contentHtml: postHtml,
        mediaUrl: item.mediaUrl || undefined,
        linkUrl: item.linkUrl || undefined,
        commentText: item.commentText || undefined,
        pageIds: itemPageIds,
        status: publishNow ? 'published' : 'scheduled',
        scheduledAt: publishNow ? undefined : postScheduledAt,
        publishedAt: publishNow ? nowIso : undefined,
        results: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // If publishNow is requested, immediately broadcast to targets
      if (publishNow) {
        try {
          const targetsPayload: PublishTarget[] = finalTargetPages.map((pg) => ({
            id: pg.id,
            platform: pg.platform,
            name: pg.name,
            pageId: pg.pageId,
            botToken: pg.botToken,
            chatId: pg.chatId,
            accessToken: pg.accessToken,
            siteUrl: pg.siteUrl,
            targetUrl: pg.targetUrl,
            bridgeApiKey: pg.bridgeApiKey,
            bridgeType: pg.bridgeType,
            wpUsername: pg.wpUsername,
            wpAppPassword: pg.wpAppPassword,
            category: item.wpCategory || pg.category,
          }));

          const dispatchResults = await dispatchToTargets({
            postType: newPost.postType,
            title: newPost.title,
            message: newPost.message,
            contentHtml: newPost.contentHtml,
            mediaUrl: newPost.mediaUrl,
            linkUrl: newPost.linkUrl,
            commentText: newPost.commentText,
            isAiGenerated: false,
            targets: targetsPayload,
          });

          newPost.results = dispatchResults.map((r) => ({
            pageId: r.pageId,
            platform: (r.platform || 'facebook') as any,
            pageName: r.pageName,
            status: r.status,
            externalPostId: r.externalPostId,
            postUrl: r.postUrl,
            error: r.error,
            timestamp: r.timestamp,
          }));
        } catch (dispatchErr) {
          console.error('[MCP API] Immediate dispatch error:', dispatchErr);
          newPost.status = 'failed';
        }
      }

      createdPosts.push(newPost);
    }

    // 4. Persist to MySQL and Local Cache
    await persistPosts(createdPosts, email);

    return NextResponse.json({
      success: true,
      message: `Successfully ${publishNow ? 'published' : 'scheduled'} ${createdPosts.length} post(s) across ${finalTargetPages.length} destination(s).`,
      count: createdPosts.length,
      targetMode,
      destinations: finalTargetPages.map((pg) => ({ id: pg.id, name: pg.name, platform: pg.platform })),
      scheduledPosts: createdPosts.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        scheduledAt: p.scheduledAt,
        targetsCount: p.pageIds.length,
        hasMedia: !!p.mediaUrl,
        hasHtmlContent: !!p.contentHtml,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error handling MCP request';
    console.error('[MCP API Error]:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
