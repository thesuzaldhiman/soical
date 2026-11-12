import { NextRequest, NextResponse } from 'next/server';
import { dispatchToTargets, PublishTarget } from '@/lib/services/publisher';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      postType = 'image',
      title = '',
      message = '',
      mediaUrl = '',
      linkUrl = '',
      commentText = '',
      contentHtml = '',
      targets = [],
    } = body;

    if (!message && !mediaUrl) {
      return NextResponse.json(
        { success: false, error: 'Post must contain either a message or media URL.' },
        { status: 400 }
      );
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one broadcasting target destination must be selected.' },
        { status: 400 }
      );
    }

    const results = await dispatchToTargets({
      postType,
      title,
      message,
      mediaUrl,
      linkUrl,
      commentText,
      contentHtml,
      targets: targets as PublishTarget[],
    });

    const isAllSuccess = results.every((r) => r.status === 'success');
    const isAnySuccess = results.some((r) => r.status === 'success');

    return NextResponse.json({
      success: isAnySuccess,
      overallStatus: isAllSuccess ? 'published' : isAnySuccess ? 'partial' : 'failed',
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: `Publishing engine error: ${message}` },
      { status: 500 }
    );
  }
}
