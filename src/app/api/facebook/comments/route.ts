import { NextRequest, NextResponse } from 'next/server';
import { PostComment, PostCommentReply } from '@/types';
import { getDbPool } from '@/lib/db/mysql';

/**
 * Helper to recover access token from MySQL for logged in user if not passed directly
 */
async function resolvePageAccessToken(request: NextRequest, pageId?: string, explicitToken?: string): Promise<string> {
  if (explicitToken && explicitToken.trim()) return explicitToken.trim();

  try {
    const userCookie = request.cookies.get('sap_google_user')?.value;
    let loggedInEmail = '';
    if (userCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(userCookie));
        loggedInEmail = (parsed.email || '').toLowerCase().trim();
      } catch {}
    }

    if (loggedInEmail) {
      const pool = getDbPool();
      if (pool) {
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
    }
  } catch (err) {
    console.warn('[Facebook Comments API] Error resolving token from DB:', err);
  }

  return '';
}

/**
 * GET: Fetch authentic comments for a post
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get('postId');
    const pageId = searchParams.get('pageId') || undefined;
    const passedToken = searchParams.get('accessToken') || undefined;

    if (!postId) {
      return NextResponse.json({ success: false, error: 'postId is required' }, { status: 400 });
    }

    const accessToken = await resolvePageAccessToken(request, pageId, passedToken);
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
      postId
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
        postId: postId,
        pageId: pageId || '',
        externalPostId: postId,
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

    const accessToken = await resolvePageAccessToken(request, pageId, passedToken);
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
      if (!postId || !message || !message.trim()) {
        return NextResponse.json(
          { success: false, error: 'postId and message are required to comment on a post' },
          { status: 400 }
        );
      }

      const form = new URLSearchParams();
      form.append('message', message.trim());
      form.append('access_token', accessToken);

      const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });

      const data = await res.json();
      if (data.error) {
        return NextResponse.json(
          { success: false, error: data.error.message || 'Meta API rejected comment' },
          { status: 400 }
        );
      }

      const newComment: PostComment = {
        id: data.id || `cmt_${Date.now()}`,
        postId,
        pageId: pageId || '',
        externalPostId: postId,
        authorName: authorName || 'Page',
        authorAvatar: authorAvatar,
        message: message.trim(),
        createdAt: new Date().toISOString(),
        likeCount: 0,
        isLikedByPage: false,
        isHidden: false,
        replies: [],
      };

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
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(commentId)}?access_token=${encodeURIComponent(
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
