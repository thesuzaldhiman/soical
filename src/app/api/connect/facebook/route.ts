import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, pageId } = body;

    if (!accessToken || !accessToken.trim()) {
      return NextResponse.json(
        { success: false, error: 'Facebook Page Access Token or User Token is required.' },
        { status: 400 }
      );
    }

    const cleanToken = accessToken.trim();

    // Case 1: Specific Page ID provided
    if (pageId && pageId.trim()) {
      const cleanPageId = pageId.trim();
      const pageRes = await fetch(
        `https://graph.facebook.com/v19.0/${cleanPageId}?fields=id,name,fan_count,picture.type(large),access_token,tasks&access_token=${cleanToken}`
      );
      const pageData = await pageRes.json();

      if (pageData.error) {
        return NextResponse.json(
          {
            success: false,
            error: `Meta Graph API Error: ${pageData.error.message} (Code: ${pageData.error.code})`,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        pages: [
          {
            id: pageData.id,
            name: pageData.name,
            fanCount: pageData.fan_count || 0,
            avatarUrl: pageData.picture?.data?.url || '',
            accessToken: pageData.access_token || cleanToken,
            tasks: pageData.tasks || ['MANAGE', 'CREATE_CONTENT'],
          },
        ],
      });
    }

    // Case 2: Fetch all pages via /me/accounts
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,fan_count,picture.type(large),access_token,tasks&access_token=${cleanToken}`
    );
    const meData = await meRes.json();

    if (meData.error) {
      // If /me/accounts fails, token might be a direct Page token for a single page, try /me directly
      const directPageRes = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name,fan_count,picture.type(large)&access_token=${cleanToken}`
      );
      const directPageData = await directPageRes.json();

      if (!directPageData.error && directPageData.id) {
        return NextResponse.json({
          success: true,
          pages: [
            {
              id: directPageData.id,
              name: directPageData.name,
              fanCount: directPageData.fan_count || 0,
              avatarUrl: directPageData.picture?.data?.url || '',
              accessToken: cleanToken,
              tasks: ['MANAGE', 'CREATE_CONTENT'],
            },
          ],
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: `Meta Graph API Error: ${meData.error.message} (Code: ${meData.error.code})`,
        },
        { status: 400 }
      );
    }

    const pagesList = (meData.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      fanCount: p.fan_count || 0,
      avatarUrl: p.picture?.data?.url || '',
      accessToken: p.access_token || cleanToken,
      tasks: p.tasks || ['MANAGE', 'CREATE_CONTENT'],
    }));

    if (pagesList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No Facebook Pages found associated with this token. Please ensure your Facebook User has Admin or Editor roles on at least one Page, and that pages_show_list permission was granted.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      pages: pagesList,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: `Failed to connect Facebook: ${message}` },
      { status: 500 }
    );
  }
}
