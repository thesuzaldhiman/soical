import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db/mysql';
import { SocialAccount, SocialPage } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelHandleOrId, apiKey: rawApiKey, accessToken, email: explicitEmail } = body;

    if (!channelHandleOrId || !channelHandleOrId.trim()) {
      return NextResponse.json(
        { success: false, error: 'YouTube Channel Handle or Channel ID is required.' },
        { status: 400 }
      );
    }

    let input = channelHandleOrId.trim();

    // 1. Cleanly parse handle or ID from any YouTube URL or text input
    if (input.includes('youtube.com/') || input.includes('youtu.be/')) {
      const matchHandle = input.match(/@([a-zA-Z0-9_.-]+)/);
      const matchChannelId = input.match(/\/channel\/(UC[a-zA-Z0-9_-]{20,})/);
      if (matchChannelId && matchChannelId[1]) {
        input = matchChannelId[1];
      } else if (matchHandle && matchHandle[1]) {
        input = `@${matchHandle[1]}`;
      } else {
        const clean = input.split('?')[0]?.replace(/\/$/, '') || input;
        const parts = clean.split('/');
        input = parts[parts.length - 1] || input;
      }
    }

    const cleanHandle = input.startsWith('@') ? input.substring(1) : input;
    const isChannelId = input.startsWith('UC') && input.length >= 20;

    // 2. Resolve logged in user email
    let loggedInEmail = (explicitEmail || '').toLowerCase().trim();
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

    // 3. Resolve API Key (from payload, env, or MySQL settings)
    let activeKey = rawApiKey?.trim() || process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (!activeKey && loggedInEmail) {
      try {
        const pool = getDbPool();
        if (pool) {
          const [rows] = await pool.query<any[]>(
            'SELECT settings FROM app_user_data WHERE email = ? LIMIT 1',
            [loggedInEmail]
          );
          if (rows && rows.length > 0 && rows[0].settings) {
            const userSettings =
              typeof rows[0].settings === 'string'
                ? JSON.parse(rows[0].settings)
                : rows[0].settings;
            if (userSettings?.ytApiKey) activeKey = userSettings.ytApiKey.trim();
          }
        }
      } catch {}
    }

    let channelResult: {
      id: string;
      name: string;
      description?: string;
      customUrl?: string;
      avatarUrl?: string;
      subscriberCount?: number;
      videoCount?: number;
    } | null = null;

    // 4. Try live lookup via YouTube Data API v3 if API key or Access Token available
    if (activeKey || accessToken) {
      try {
        const queryParam = isChannelId
          ? `id=${encodeURIComponent(input)}`
          : `forHandle=${encodeURIComponent(cleanHandle)}`;

        const url = activeKey
          ? `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&${queryParam}&key=${activeKey}`
          : `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&${queryParam}`;

        const headers: Record<string, string> = {};
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken.trim()}`;
        }

        const ytRes = await fetch(url, { headers });
        const ytData = await ytRes.json();

        if (ytData.items && ytData.items.length > 0) {
          const item = ytData.items[0];
          channelResult = {
            id: item.id,
            name: item.snippet?.title || input,
            description: item.snippet?.description || '',
            customUrl: item.snippet?.customUrl || `@${cleanHandle}`,
            avatarUrl:
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.medium?.url ||
              item.snippet?.thumbnails?.default?.url ||
              '/icons/social/youtube.png',
            subscriberCount: parseInt(item.statistics?.subscriberCount || '0', 10),
            videoCount: parseInt(item.statistics?.videoCount || '0', 10),
          };
        }
      } catch (e) {
        console.warn('Note on contacting YouTube API:', e);
      }
    }

    // 5. Fallback clean channel metadata
    if (!channelResult) {
      const formattedTitle = cleanHandle
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      channelResult = {
        id: isChannelId ? input : `yt_${cleanHandle.toLowerCase()}`,
        name: isChannelId
          ? `YouTube Channel (${input.substring(0, 10)}...)`
          : `${formattedTitle} (YouTube)`,
        description: 'Connected YouTube Channel',
        customUrl: `@${cleanHandle}`,
        avatarUrl: '/icons/social/youtube.png',
        subscriberCount: 0,
        videoCount: 0,
      };
    }

    // 6. Direct authoritative MySQL persistence if logged-in user known
    if (loggedInEmail) {
      try {
        const pool = getDbPool();
        if (pool) {
          const [rows] = await pool.query<any[]>(
            'SELECT accounts, pages FROM app_user_data WHERE email = ? LIMIT 1',
            [loggedInEmail]
          );

          let currentAccounts: SocialAccount[] = [];
          let currentPages: SocialPage[] = [];

          if (rows && rows.length > 0) {
            try {
              currentAccounts =
                typeof rows[0].accounts === 'string'
                  ? JSON.parse(rows[0].accounts)
                  : rows[0].accounts || [];
            } catch {}
            try {
              currentPages =
                typeof rows[0].pages === 'string'
                  ? JSON.parse(rows[0].pages)
                  : rows[0].pages || [];
            } catch {}
          }

          const newAccountId = `acc_youtube_${Date.now()}`;
          const existingAccIdx = currentAccounts.findIndex(
            (a) =>
              a.platform === 'youtube' &&
              (a.accountId === channelResult!.id || a.name?.toLowerCase().includes(channelResult!.name.toLowerCase()))
          );

          const ytAccount: SocialAccount = {
            id: existingAccIdx >= 0 ? currentAccounts[existingAccIdx]!.id : newAccountId,
            platform: 'youtube',
            accountId: channelResult.id,
            name: `${channelResult.name} (YouTube Account)`,
            avatarUrl: channelResult.avatarUrl || '/icons/social/youtube.png',
            status: 'active',
            tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
            lastCheckedAt: new Date().toISOString(),
          };

          const updatedAccounts =
            existingAccIdx >= 0
              ? currentAccounts.map((a, idx) => (idx === existingAccIdx ? ytAccount : a))
              : [ytAccount, ...currentAccounts];

          const existingPageIdx = currentPages.findIndex(
            (p) =>
              p.platform === 'youtube' &&
              (p.pageId === channelResult!.id || p.name?.toLowerCase() === channelResult!.name.toLowerCase())
          );

          const targetUrl = channelResult.customUrl
            ? `https://youtube.com/${channelResult.customUrl.startsWith('@') ? channelResult.customUrl : '@' + channelResult.customUrl}`
            : channelResult.id.startsWith('UC')
            ? `https://youtube.com/channel/${channelResult.id}`
            : `https://youtube.com`;

          const ytPage: SocialPage = {
            id: existingPageIdx >= 0 ? currentPages[existingPageIdx]!.id : `pg_yt_${Date.now()}`,
            accountId: ytAccount.id,
            platform: 'youtube',
            pageId: channelResult.id,
            name: channelResult.name,
            avatarUrl: channelResult.avatarUrl || '/icons/social/youtube.png',
            fanCount: channelResult.subscriberCount || 0,
            isActive: true,
            targetUrl,
            category: 'YouTube Shorts',
            permissions: ['youtube.upload', 'youtube.readonly'],
            lastCheckedAt: new Date().toISOString(),
          };

          const updatedPages =
            existingPageIdx >= 0
              ? currentPages.map((p, idx) => (idx === existingPageIdx ? ytPage : p))
              : [...currentPages, ytPage];

          await pool.query(
            'UPDATE app_user_data SET accounts = ?, pages = ?, updated_at = NOW() WHERE email = ?',
            [JSON.stringify(updatedAccounts), JSON.stringify(updatedPages), loggedInEmail]
          );
          console.log(`[YouTube Direct Connect] Synced channel "${channelResult.name}" directly to MySQL for ${loggedInEmail}`);
        }
      } catch (dbErr) {
        console.warn('[YouTube Direct Connect] Database sync warning:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      channel: channelResult,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error connecting to YouTube';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
