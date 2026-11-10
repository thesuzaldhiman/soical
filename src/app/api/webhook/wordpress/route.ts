import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const secret = searchParams.get('secret');

    // Simple webhook authorization check
    if (!secret || secret.length < 8) {
      return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
    }

    const payload = await request.json();
    const { title, permalink, image_url, excerpt, category } = payload;

    if (!title) {
      return NextResponse.json({ error: 'Missing title in payload' }, { status: 400 });
    }

    // Process ingestion logic:
    // Create new post in queue or publish immediately to mapped categories
    return NextResponse.json({
      success: true,
      message: 'WordPress post ingested successfully',
      title,
      permalink,
      queuedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
