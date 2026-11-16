import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { Post } from '@/types';
import { sanitizePostMedia } from '@/lib/utils/media-storage';

function parsePosts(raw: any): Post[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function resolveEmail(request: NextRequest, bodyEmail?: string): string {
  if (bodyEmail && bodyEmail.includes('@')) {
    return bodyEmail.toLowerCase().trim();
  }
  const urlEmail = request.nextUrl.searchParams.get('email');
  if (urlEmail && urlEmail.includes('@')) {
    return urlEmail.toLowerCase().trim();
  }
  const userCookie =
    request.cookies.get('sap_user_session')?.value ||
    request.cookies.get('sap_google_user')?.value;
  if (userCookie) {
    try {
      let decoded = userCookie;
      try {
        decoded = decodeURIComponent(userCookie);
      } catch {}
      const parsed = JSON.parse(decoded);
      if (parsed.email && parsed.email.includes('@')) {
        return parsed.email.toLowerCase().trim();
      }
    } catch {}
  }
  return 'suzaldhiman@gmail.com';
}

/**
 * GET /api/posts?email=...
 * Fetch authoritative user posts directly from MySQL app_user_data
 */
export async function GET(request: NextRequest) {
  const email = resolveEmail(request);
  const pool = getDbPool();

  if (!pool) {
    return NextResponse.json({ success: true, posts: [], source: 'no_db_configured' });
  }

  try {
    let rows: any[];
    try {
      [rows] = await pool.query<any[]>(
        'SELECT posts FROM app_user_data WHERE email = ? LIMIT 1',
        [email]
      );
    } catch (queryErr: any) {
      if (queryErr?.code === 'ER_NO_SUCH_TABLE') {
        await initDbTables();
        [rows] = await pool.query<any[]>(
          'SELECT posts FROM app_user_data WHERE email = ? LIMIT 1',
          [email]
        );
      } else {
        throw queryErr;
      }
    }

    if (!rows || rows.length === 0 || !rows[0].posts) {
      return NextResponse.json({ success: true, posts: [], source: 'mysql_empty' });
    }

    const rawPosts = parsePosts(rows[0].posts);
    let hadBase64 = false;
    const sanitizedPosts = rawPosts.map((p) => {
      const sanitized = sanitizePostMedia(p);
      if (sanitized.mediaUrl !== p.mediaUrl || sanitized.thumbnailUrl !== p.thumbnailUrl) {
        hadBase64 = true;
      }
      return sanitized;
    });

    if (hadBase64) {
      pool.query(
        'UPDATE app_user_data SET posts = ?, updated_at = NOW() WHERE email = ?',
        [JSON.stringify(sanitizedPosts), email]
      ).catch((e) => console.warn('[API Posts GET] Background offload DB update warning:', e));
    }

    return NextResponse.json({ success: true, posts: sanitizedPosts, source: 'mysql' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database error';
    console.error('[API Posts GET] Error querying posts:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * PATCH /api/posts
 * Body: { email, postId, updates }
 * Atomically updates a single post (status, results, publishedAt, etc.) in MySQL
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, updates } = body;
    const email = resolveEmail(request, body.email);

    if (!postId) {
      return NextResponse.json({ success: false, error: 'postId is required' }, { status: 400 });
    }

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ success: true, message: 'DB not connected' });
    }

    let rows: any[];
    try {
      [rows] = await pool.query<any[]>(
        'SELECT posts, workspace FROM app_user_data WHERE email = ? LIMIT 1',
        [email]
      );
    } catch (queryErr: any) {
      if (queryErr?.code === 'ER_NO_SUCH_TABLE') {
        await initDbTables();
        [rows] = await pool.query<any[]>(
          'SELECT posts, workspace FROM app_user_data WHERE email = ? LIMIT 1',
          [email]
        );
      } else {
        throw queryErr;
      }
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User data not found' }, { status: 404 });
    }

    const currentPosts = parsePosts(rows[0].posts);
    let postFound = false;
    let updatedPost: Post | null = null;
    const sanitizedUpdates = updates ? sanitizePostMedia(updates) : {};

    const newPosts = currentPosts.map((p) => {
      if (p.id === postId) {
        postFound = true;
        updatedPost = sanitizePostMedia({
          ...p,
          ...sanitizedUpdates,
          updatedAt: new Date().toISOString(),
        });
        return updatedPost;
      }
      return p;
    });

    if (!postFound) {
      return NextResponse.json({ success: false, error: `Post ${postId} not found` }, { status: 404 });
    }

    // Increment workspace monthlyPostsUsed if post was marked as published
    let ws = rows[0].workspace;
    if (updates?.status === 'published') {
      try {
        const wsObj = typeof ws === 'string' ? JSON.parse(ws) : ws || {};
        wsObj.monthlyPostsUsed = (wsObj.monthlyPostsUsed || 0) + 1;
        ws = JSON.stringify(wsObj);
      } catch {}
    }

    await pool.query(
      'UPDATE app_user_data SET posts = ?, workspace = ?, updated_at = NOW() WHERE email = ?',
      [JSON.stringify(newPosts), typeof ws === 'string' ? ws : JSON.stringify(ws), email]
    );

    return NextResponse.json({
      success: true,
      message: 'Post updated in database successfully',
      post: updatedPost,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database error';
    console.error('[API Posts PATCH] Error updating post:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * DELETE /api/posts
 * Body or query: { email, postId } or { email, postIds: [] }
 * Permanently deletes specified post(s) from MySQL app_user_data
 */
export async function DELETE(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const searchParams = request.nextUrl.searchParams;
    const postId = body.postId || searchParams.get('id') || searchParams.get('postId');
    const postIds: string[] = Array.isArray(body.postIds)
      ? body.postIds
      : postId
      ? [postId]
      : [];

    const email = resolveEmail(request, body.email);

    if (postIds.length === 0) {
      return NextResponse.json({ success: false, error: 'postId or postIds required' }, { status: 400 });
    }

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ success: true, message: 'DB not connected' });
    }

    let rows: any[];
    try {
      [rows] = await pool.query<any[]>(
        'SELECT posts FROM app_user_data WHERE email = ? LIMIT 1',
        [email]
      );
    } catch (queryErr: any) {
      if (queryErr?.code === 'ER_NO_SUCH_TABLE') {
        await initDbTables();
        [rows] = await pool.query<any[]>(
          'SELECT posts FROM app_user_data WHERE email = ? LIMIT 1',
          [email]
        );
      } else {
        throw queryErr;
      }
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, message: 'No posts found to delete' });
    }

    const currentPosts = parsePosts(rows[0].posts);
    const deleteSet = new Set(postIds);
    const remainingPosts = currentPosts.filter((p) => !deleteSet.has(p.id));

    await pool.query(
      'UPDATE app_user_data SET posts = ?, updated_at = NOW() WHERE email = ?',
      [JSON.stringify(remainingPosts), email]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${postIds.length} post(s) from database`,
      deletedCount: postIds.length,
      remainingCount: remainingPosts.length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database error';
    console.error('[API Posts DELETE] Error deleting post:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * POST /api/posts
 * Body: { email, post: Post } or { email, posts: Post[] }
 * Atomically inserts or prepends new post(s) into MySQL app_user_data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = resolveEmail(request, body.email);
    const rawIncoming: Post[] = Array.isArray(body.posts)
      ? body.posts
      : body.post
      ? [body.post]
      : [];

    if (rawIncoming.length === 0) {
      return NextResponse.json({ success: false, error: 'post or posts required' }, { status: 400 });
    }

    const incoming = rawIncoming.map((p) => sanitizePostMedia(p));

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ success: true, message: 'DB not connected' });
    }

    let rows: any[];
    try {
      [rows] = await pool.query<any[]>(
        'SELECT posts FROM app_user_data WHERE email = ? LIMIT 1',
        [email]
      );
    } catch (queryErr: any) {
      if (queryErr?.code === 'ER_NO_SUCH_TABLE') {
        await initDbTables();
        [rows] = await pool.query<any[]>(
          'SELECT posts FROM app_user_data WHERE email = ? LIMIT 1',
          [email]
        );
      } else {
        throw queryErr;
      }
    }

    const currentPosts = rows && rows.length > 0 ? parsePosts(rows[0].posts) : [];
    const incomingMap = new Map<string, Post>();
    incoming.forEach((p) => {
      if (p && p.id) incomingMap.set(p.id, p);
    });

    const updatedPosts = [
      ...incoming,
      ...currentPosts.filter((p) => !incomingMap.has(p.id)),
    ].slice(0, 500);

    if (!rows || rows.length === 0) {
      await pool.query(
        'INSERT INTO app_user_data (email, posts, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE posts = VALUES(posts), updated_at = NOW()',
        [email, JSON.stringify(updatedPosts)]
      );
    } else {
      await pool.query(
        'UPDATE app_user_data SET posts = ?, updated_at = NOW() WHERE email = ?',
        [JSON.stringify(updatedPosts), email]
      );
    }

    return NextResponse.json({ success: true, count: updatedPosts.length });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database error';
    console.error('[API Posts POST] Error inserting posts:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
