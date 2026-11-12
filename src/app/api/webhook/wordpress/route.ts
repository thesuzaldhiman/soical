import { NextRequest, NextResponse } from 'next/server';
import { dispatchToTargets, PublishTarget } from '@/lib/services/publisher';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const secret = searchParams.get('secret');

    // Simple webhook authorization check
    if (!secret || secret.length < 8) {
      return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
    }

    const payload = await request.json();
    const { title, permalink, image_url, excerpt, category, targets = [] } = payload;

    if (!title) {
      return NextResponse.json({ error: 'Missing title in payload' }, { status: 400 });
    }

    let dispatchResults: any[] = [];
    if (Array.isArray(targets) && targets.length > 0) {
      const message = `${title}\n\n${excerpt || ''}`.trim();
      const commentText = permalink ? `👉 पूरी खबर यहाँ पढ़ें: ${permalink}` : '';

      dispatchResults = await dispatchToTargets({
        postType: image_url ? 'image' : 'text',
        title,
        message,
        mediaUrl: image_url || '',
        linkUrl: permalink || '',
        commentText,
        targets: targets as PublishTarget[],
      });
    }

    return NextResponse.json({
      success: true,
      message: 'WordPress post ingested successfully',
      title,
      permalink,
      dispatchedCount: dispatchResults.length,
      results: dispatchResults,
      queuedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
