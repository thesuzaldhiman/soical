import { NextRequest, NextResponse } from 'next/server';
import { PostComment, PostCommentReply } from '@/types';
import { getDbPool } from '@/lib/db/mysql';

/**
 * Helper to recover access token from MySQL for logged in user if not passed directly
 */
async function resolvePageAccessToken(
  request: NextRequest,
  pageId?: string,
  explicitToken?: string,
  explicitEmail?: string
): Promise<string> {
  if (explicitToken && explicitToken.trim()) return explicitToken.trim();

  try {
    let loggedInEmail = (explicitEmail || '').toLowerCase().trim();
    if (!loggedInEmail) {
      loggedInEmail = (request.nextUrl.searchParams.get('email') || '').toLowerCase().trim();
    }

    if (!loggedInEmail) {
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
          loggedInEmail = (parsed.email || '').toLowerCase().trim();
        } catch {}
      }
    }

    const pool = getDbPool();
    if (pool) {
      if (loggedInEmail) {
        const [rows] = await pool.query<any[]>(
          'SELECT pages, accounts FROM app_user_data WHERE email = ? LIMIT 1',
          [loggedInEmail]
        );
        if (rows && rows.length > 0) {
          const dbPages = typeof rows[0].pages === 'string' ? JSON.parse(rows[0].pages) : rows[0].pages || [];
          const dbAccounts = typeof rows[0].accounts === 'string' ? JSON.parse(rows[0].accounts) : rows[0].accounts || [];

          if (pageId) {
            const matchPage = dbPages.find((p: any) => p.pageId === pageId || p.id === pageId);
            if (matchPage?.accessToken) return matchPage.accessToken;
          }

          const fbPage = dbPages.find((p: any) => (p.platform === 'facebook' || p.platform?.includes('fb')) && p.accessToken);
          if (fbPage?.accessToken) return fbPage.accessToken;

          const fbAccount = dbAccounts.find((a: any) => a.platform === 'facebook' && a.accessToken);
          if (fbAccount?.accessToken) return fbAccount.accessToken;
        }
      }

      // Fallback: If pageId was provided but not found under loggedInEmail, search all tenant pages by pageId
      if (pageId) {
        const [allRows] = await pool.query<any[]>('SELECT pages, accounts FROM app_user_data');
        if (allRows && allRows.length > 0) {
          for (const r of allRows) {
            const dbPages = typeof r.pages === 'string' ? JSON.parse(r.pages) : r.pages || [];
            const matchPage = dbPages.find((p: any) => p.pageId === pageId || p.id === pageId);
            if (matchPage?.accessToken) return matchPage.accessToken;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Facebook Comments API] Error resolving token from DB:', err);
  }

  return '';
}

/**
 * Helper to resolve Facebook external post ID (numeric or pageId_postId)
 * If postId is an internal tool ID (e.g. 'pst_...' or 'post_...'), lookup in MySQL app_user_data
 */
async function resolveFacebookPostId(
  postId: string,
  externalPostId?: string,
  pageId?: string,
  explicitEmail?: string
): Promise<string> {
  // If externalPostId is already a valid Facebook ID (not internal pst_ / post_ / sim_)
  if (
    externalPostId &&
    !externalPostId.startsWith('pst_') &&
    !externalPostId.startsWith('post_') &&
    !externalPostId.startsWith('sim_')
  ) {
    return externalPostId.trim();
  }

  // If postId itself is already an authentic Facebook ID (digits or digits_digits)
  if (
    postId &&
    !postId.startsWith('pst_') &&
    !postId.startsWith('post_') &&
    !postId.startsWith('sim_')
  ) {
    return postId.trim();
  }

  // Attempt database resolution from MySQL
  try {
    const pool = getDbPool();
    if (pool) {
      let query = 'SELECT posts FROM app_user_data';
      const params: any[] = [];
      if (explicitEmail) {
        query += ' WHERE email = ? LIMIT 1';
        params.push(explicitEmail.toLowerCase().trim());
      }

      const [rows] = await pool.query<any[]>(query, params);
      if (rows && rows.length > 0) {
        for (const r of rows) {
          const dbPosts = typeof r.posts === 'string' ? JSON.parse(r.posts) : r.posts || [];
          if (!Array.isArray(dbPosts)) continue;

          const matchPost = dbPosts.find((p: any) => p.id === postId || p.externalPostId === postId);
          if (matchPost) {
            // First check page-specific result
            if (pageId && Array.isArray(matchPost.results)) {
              const pageRes = matchPost.results.find(
                (res: any) =>
                  (res.pageId === pageId || res.platform === 'facebook') &&
                  res.externalPostId &&
                  !res.externalPostId.startsWith('sim_') &&
                  !res.externalPostId.startsWith('pst_')
              );
              if (pageRes?.externalPostId) return pageRes.externalPostId;
            }

            // Check post.externalPostId
            if (
              matchPost.externalPostId &&
              !matchPost.externalPostId.startsWith('sim_') &&
              !matchPost.externalPostId.startsWith('pst_')
            ) {
              return matchPost.externalPostId;
            }

            // Check any successful facebook result in results
            if (Array.isArray(matchPost.results)) {
              const anyFb = matchPost.results.find(
                (res: any) =>
                  (res.platform === 'facebook' || !res.platform) &&
                  res.externalPostId &&
                  !res.externalPostId.startsWith('sim_') &&
                  !res.externalPostId.startsWith('pst_')
              );
              if (anyFb?.externalPostId) return anyFb.externalPostId;
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Facebook Comments API] Error resolving post ID from DB:', err);
  }

  return (externalPostId || postId || '').trim();
}

/**
 * GET: Fetch authentic comments for a post
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get('postId') || '';
    const externalPostId = searchParams.get('externalPostId') || undefined;
    const pageId = searchParams.get('pageId') || undefined;
    const passedToken = searchParams.get('accessToken') || undefined;
    const explicitEmail = searchParams.get('email') || undefined;

    if (!postId && !externalPostId) {
      return NextResponse.json({ success: false, error: 'postId is required' }, { status: 400 });
    }

    const resolvedFbPostId = await resolveFacebookPostId(postId, externalPostId, pageId, explicitEmail);

    // If still an internal tool ID (post was not published to Facebook), return empty comments gracefully
    if (!resolvedFbPostId || resolvedFbPostId.startsWith('pst_') || resolvedFbPostId.startsWith('post_') || resolvedFbPostId.startsWith('sim_')) {
      return NextResponse.json({
        success: true,
        count: 0,
        comments: [],
        note: 'Post not published to Facebook or no external post ID available.'
      });
    }

    const accessToken = await resolvePageAccessToken(request, pageId, passedToken, explicitEmail);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Facebook access token could not be found for this post/page.' },
        { status: 401 }
      );
    }

    // Query Meta Graph API for authentic comments on this post
    const fields =
      'id,message,from,created_time,like_count,user_likes,is_hidden,can_reply_privately,comment_count,comments{id,message,from,created_time,like_count,user_likes}';
    const commentsUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(
      resolvedFbPostId
    )}/comments?fields=${fields}&summary=true&limit=100&access_token=${encodeURIComponent(accessToken)}`;

    const res = await fetch(commentsUrl);
    const data = await res.json();

    if (data.error) {
      console.error('[Facebook Comments API] Meta error:', data.error);
      return NextResponse.json(
        { success: false, error: data.error.message || 'Failed to fetch Facebook comments' },
        { status: 400 }
      );
    }

    const rawComments = Array.isArray(data.data) ? data.data : [];
    const formattedComments: PostComment[] = rawComments.map((c: any) => {
      const nestedReplies: PostCommentReply[] = Array.isArray(c.comments?.data)
        ? c.comments.data.map((r: any) => ({
            id: r.id,
            authorName: r.from?.name || 'Page',
            authorAvatar: r.from?.id ? `https://graph.facebook.com/v19.0/${r.from.id}/picture?type=small` : undefined,
            isPageAuthor: Boolean(pageId && r.from?.id === pageId),
            message: r.message || '',
            createdAt: r.created_time || new Date().toISOString(),
          }))
        : [];

      return {
        id: c.id,
        postId: postId || resolvedFbPostId,
        pageId: pageId || '',
        externalPostId: resolvedFbPostId,
        authorName: c.from?.name || 'Facebook User',
        authorAvatar: c.from?.id ? `https://graph.facebook.com/v19.0/${c.from.id}/picture?type=small` : undefined,
        message: c.message || '',
        createdAt: c.created_time || new Date().toISOString(),
        likeCount: Number(c.like_count ?? 0),
        isLikedByPage: Boolean(c.user_likes),
        isHidden: Boolean(c.is_hidden),
        privateReplySent: false,
        replies: nestedReplies,
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedComments.length,
      comments: formattedComments,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: `Comments fetch failed: ${errorMsg}` },
      { status: 500 }
    );
  }
}

/**
 * POST: Execute comment actions: reply, create_comment, like, unlike, hide, unhide, delete, private_reply
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action = 'reply',
      commentId,
      postId,
      message,
      pageId,
      accessToken: passedToken,
      authorName,
      authorAvatar,
    } = body;

    const explicitEmail = body.email || request.nextUrl.searchParams.get('email') || undefined;
    const accessToken = await resolvePageAccessToken(request, pageId, passedToken, explicitEmail);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Facebook access token required to perform comment operations.' },
        { status: 401 }
      );
    }

    // 1. Reply to an existing comment
    if (action === 'reply') {
      if (!commentId || !message || !message.trim()) {
        return NextResponse.json(
          { success: false, error: 'commentId and message are required for reply' },
          { status: 400 }
        );
      }

      const form = new URLSearchParams();
      form.append('message', message.trim());
      form.append('access_token', accessToken);

      const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(commentId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });

      const data = await res.json();
      if (data.error) {
        return NextResponse.json(
          { success: false, error: data.error.message || 'Meta API rejected reply' },
          { status: 400 }
        );
      }

      const newReply: PostCommentReply = {
        id: data.id || `rep_${Date.now()}`,
        authorName: authorName || 'Page Reply',
        authorAvatar: authorAvatar,
        isPageAuthor: true,
        message: message.trim(),
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        reply: newReply,
        commentId,
      });
    }

    // 2. Post top-level comment on a post
    if (action === 'create_comment') {
      if ((!postId && !body.externalPostId) || !message || !message.trim()) {
        return NextResponse.json(
          { success: false, error: 'postId and message are required to comment on a post' },
          { status: 400 }
        );
      }

      const resolvedFbPostId = await resolveFacebookPostId(
        postId,
        body.externalPostId,
        pageId,
        explicitEmail
      );

      if (
        !resolvedFbPostId ||
        resolvedFbPostId.startsWith('pst_') ||
        resolvedFbPostId.startsWith('post_') ||
        resolvedFbPostId.startsWith('sim_')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot comment on Facebook: Valid Facebook post ID not found. Ensure this post was published to Facebook.',
          },
          { status: 400 }
        );
      }

      // Build candidate IDs to try with Meta Graph API
      const candidateIds: string[] = [];
      candidateIds.push(resolvedFbPostId);

      // If resolved ID has no underscore and pageId is provided, try pageId_postId
      if (!resolvedFbPostId.includes('_') && pageId) {
        candidateIds.push(`${pageId}_${resolvedFbPostId}`);
      }

      // If resolved ID has an underscore (e.g. 12345_67890), also try the right part
      if (resolvedFbPostId.includes('_')) {
        const parts = resolvedFbPostId.split('_');
        if (parts[1]) candidateIds.push(parts[1]);
      }

      // Also try body.externalPostId if different
      if (
        body.externalPostId &&
        body.externalPostId !== resolvedFbPostId &&
        !body.externalPostId.startsWith('pst_') &&
        !body.externalPostId.startsWith('sim_')
      ) {
        candidateIds.push(body.externalPostId);
      }

      let metaData: any = null;
      let successfulId = resolvedFbPostId;
      let lastError = 'Meta API rejected comment';

      for (const candId of Array.from(new Set(candidateIds))) {
        try {
          const form = new URLSearchParams();
          form.append('message', message.trim());
          form.append('access_token', accessToken);

          const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(candId)}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form.toString(),
          });

          const data = await res.json().catch(() => null);
          if (res.ok && data?.id) {
            metaData = data;
            successfulId = candId;
            break;
          }

          lastError = data?.error?.message || `HTTP ${res.status}`;
          console.warn(`[Facebook Comments API] Comment attempt failed on ${candId}:`, lastError);
        } catch (postErr: any) {
          lastError = postErr?.message || 'Network exception';
        }
      }

      if (!metaData?.id) {
        return NextResponse.json(
          { success: false, error: lastError || 'Meta API rejected comment' },
          { status: 400 }
        );
      }

      const newComment: PostComment = {
        id: metaData.id,
        postId: postId || successfulId,
        pageId: pageId || '',
        externalPostId: successfulId,
        authorName: authorName || 'Page',
        authorAvatar: authorAvatar,
        message: message.trim(),
        createdAt: new Date().toISOString(),
        likeCount: 0,
        isLikedByPage: false,
        isHidden: false,
        replies: [],
      };

      // Persist to MySQL app_user_data.post_comments if possible
      try {
        const pool = getDbPool();
        if (pool && explicitEmail) {
          const [rows] = await pool.query<any[]>(
            'SELECT post_comments FROM app_user_data WHERE email = ? LIMIT 1',
            [explicitEmail.toLowerCase().trim()]
          );
          if (rows && rows.length > 0) {
            const current = typeof rows[0].post_comments === 'string'
              ? JSON.parse(rows[0].post_comments)
              : rows[0].post_comments || [];
            const updated = [newComment, ...(Array.isArray(current) ? current : [])];
            await pool.query(
              'UPDATE app_user_data SET post_comments = ? WHERE email = ?',
              [JSON.stringify(updated), explicitEmail.toLowerCase().trim()]
            );
          }
        }
      } catch (dbErr) {
        console.warn('[Facebook Comments API] Error saving new comment to DB:', dbErr);
      }

      return NextResponse.json({
        success: true,
        comment: newComment,
      });
    }

    // 3. Like comment
    if (action === 'like') {
      if (!commentId) return NextResponse.json({ success: false, error: 'commentId required' }, { status: 400 });
      const form = new URLSearchParams();
      form.append('access_token', accessToken);

      const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(commentId)}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ success: false, error: data.error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    // 4. Unlike comment
    if (action === 'unlike') {
      if (!commentId) return NextResponse.json({ success: false, error: 'commentId required' }, { status: 400 });
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(commentId)}/likes?access_token=${encodeURIComponent(
          accessToken
        )}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ success: false, error: data.error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    // 5. Hide / Unhide comment
    if (action === 'hide' || action === 'unhide') {
      if (!commentId) return NextResponse.json({ success: false, error: 'commentId required' }, { status: 400 });
      const form = new URLSearchParams();
      form.append('is_hidden', action === 'hide' ? 'true' : 'false');
      form.append('access_token', accessToken);

      const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(commentId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ success: false, error: data.error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, isHidden: action === 'hide' });
    }

    // 6. Delete comment
    if (action === 'delete') {
      if (!commentId) return NextResponse.json({ success: false, error: 'commentId required' }, { status: 400 });

      // If local/optimistic ID that was never saved to Meta:
      if (commentId.startsWith('cmt_') || commentId.startsWith('temp_')) {
        return NextResponse.json({ success: true, localOnly: true });
      }

      // Live delete on Facebook via Meta Graph API:
      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(commentId)}?access_token=${encodeURIComponent(
          accessToken
        )}`,
        { method: 'DELETE' }
      );
      const data = await metaRes.json().catch(() => null);

      if (data?.error) {
        // If comment does not exist (already deleted on Facebook), consider it successfully removed
        if (data.error.code === 100 || (data.error.message && data.error.message.includes('does not exist'))) {
          console.log(`[Facebook Comments API] Comment ${commentId} already deleted on Facebook.`);
        } else {
          return NextResponse.json({ success: false, error: data.error.message }, { status: 400 });
        }
      }

      // Clean from MySQL app_user_data.post_comments
      try {
        const pool = getDbPool();
        if (pool && explicitEmail) {
          const [rows] = await pool.query<any[]>(
            'SELECT post_comments FROM app_user_data WHERE email = ? LIMIT 1',
            [explicitEmail.toLowerCase().trim()]
          );
          if (rows && rows.length > 0 && rows[0].post_comments) {
            const current = typeof rows[0].post_comments === 'string'
              ? JSON.parse(rows[0].post_comments)
              : rows[0].post_comments;
            if (Array.isArray(current)) {
              const updated = current.filter((c: any) => c.id !== commentId);
              await pool.query(
                'UPDATE app_user_data SET post_comments = ? WHERE email = ?',
                [JSON.stringify(updated), explicitEmail.toLowerCase().trim()]
              );
            }
          }
        }
      } catch (dbErr) {
        console.warn('[Facebook Comments API] Error cleaning deleted comment from DB:', dbErr);
      }

      return NextResponse.json({ success: true });
    }

    // 7. 1-Time Private DM Reply (within 7 days of user comment)
    if (action === 'private_reply') {
      if (!commentId || !message || !message.trim()) {
        return NextResponse.json(
          { success: false, error: 'commentId and message required for private reply' },
          { status: 400 }
        );
      }
      const form = new URLSearchParams();
      form.append('message', message.trim());
      form.append('access_token', accessToken);

      const res = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(commentId)}/private_replies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        }
      );
      const data = await res.json();
      if (data.error) {
        return NextResponse.json({ success: false, error: data.error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, privateReplySent: true });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: `Comment action error: ${errorMsg}` },
      { status: 500 }
    );
  }
}
