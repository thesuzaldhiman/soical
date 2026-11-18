import { NextRequest, NextResponse } from 'next/server';
import {
  resolveYouTubeChannel,
  fetchChannelLatestVideos,
  checkIfVideoIsShort,
} from '@/lib/services/server-youtube-downloader';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { success: false, error: 'YouTube channel URL or @handle is required.' },
        { status: 400 }
      );
    }

    // Step 1: Resolve Channel Info
    const channel = await resolveYouTubeChannel(url.trim());

    // Step 2: Fetch sample latest videos from feed
    let sampleVideos = await fetchChannelLatestVideos(channel.channelId, 6);

    // Step 3: Check Shorts status for preview
    sampleVideos = await Promise.all(
      sampleVideos.map(async (v) => {
        const isShort = await checkIfVideoIsShort(v.id);
        return { ...v, isShort };
      })
    );

    return NextResponse.json({
      success: true,
      channel,
      sampleVideos,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to resolve YouTube channel';
    console.error('[API YouTube Resolve] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
