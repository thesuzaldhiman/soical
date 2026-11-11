import { NextRequest, NextResponse } from 'next/server';

interface SyncPageInput {
  id: string;
  platform: 'facebook' | 'instagram' | 'youtube' | 'threads' | 'telegram';
  pageId?: string;
  accessToken?: string;
  botToken?: string;
  chatId?: string;
  targetUrl?: string;
  fanCount?: number;
  followersCount?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pages: SyncPageInput[] = Array.isArray(body.pages) ? body.pages : body.page ? [body.page] : [];
    const ytApiKey = body.ytApiKey || process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;

    if (pages.length === 0) {
      return NextResponse.json({ success: true, synced: [] });
    }

    const syncResults = await Promise.all(
      pages.map(async (pg) => {
        const fallbackCount = pg.followersCount ?? pg.fanCount ?? 0;

        // 1. FACEBOOK LIVE SYNC
        if (pg.platform === 'facebook' && pg.accessToken && pg.pageId) {
          try {
            const fbRes = await fetch(
              `https://graph.facebook.com/v19.0/${encodeURIComponent(pg.pageId)}?fields=fan_count,followers_count,name&access_token=${encodeURIComponent(pg.accessToken)}`
            );
            const fbData = await fbRes.json();
            if (!fbData.error && (fbData.fan_count !== undefined || fbData.followers_count !== undefined)) {
              const liveFollowers = fbData.followers_count ?? fbData.fan_count ?? fallbackCount;
              const liveFans = fbData.fan_count ?? liveFollowers;
              return {
                id: pg.id,
                followersCount: liveFollowers,
                fanCount: liveFans,
                name: fbData.name,
                live: true,
                status: 'synced_live',
              };
            }
          } catch (e) {
            console.error(`Facebook sync error for ${pg.id}:`, e);
          }
        }

        // 2. YOUTUBE LIVE SYNC
        if (pg.platform === 'youtube' && (pg.pageId || pg.targetUrl)) {
          try {
            const rawId = pg.pageId || '';
            const isChannelId = rawId.startsWith('UC') && rawId.length >= 20;
            const handleMatch = pg.targetUrl?.match(/@([a-zA-Z0-9_.-]+)/);
            const handle = handleMatch ? handleMatch[1] : rawId.replace('@', '');

            if (ytApiKey) {
              const query = isChannelId
                ? `id=${encodeURIComponent(rawId)}`
                : `forHandle=${encodeURIComponent(handle)}`;
              const ytRes = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&${query}&key=${ytApiKey}`
              );
              const ytData = await ytRes.json();
              if (ytData.items && ytData.items.length > 0) {
                const item = ytData.items[0];
                const subs = parseInt(item.statistics?.subscriberCount || '0', 10);
                return {
                  id: pg.id,
                  followersCount: subs,
                  fanCount: subs,
                  name: item.snippet?.title,
                  live: true,
                  status: 'synced_live',
                };
              }
            }
          } catch (e) {
            console.error(`YouTube sync error for ${pg.id}:`, e);
          }
        }

        // 3. TELEGRAM LIVE SYNC
        if (pg.platform === 'telegram' && pg.botToken && pg.chatId) {
          try {
            const tgRes = await fetch(
              `https://api.telegram.org/bot${encodeURIComponent(pg.botToken)}/getChatMemberCount?chat_id=${encodeURIComponent(pg.chatId)}`
            );
            const tgData = await tgRes.json();
            if (tgData.ok && typeof tgData.result === 'number') {
              return {
                id: pg.id,
                followersCount: tgData.result,
                fanCount: tgData.result,
                live: true,
                status: 'synced_live',
              };
            }
          } catch (e) {
            console.error(`Telegram sync error for ${pg.id}:`, e);
          }
        }

        // Fallback: Maintain exact current followers count without fake inflation
        return {
          id: pg.id,
          followersCount: fallbackCount,
          fanCount: fallbackCount,
          live: false,
          status: 'verified_unaltered',
        };
      })
    );

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
