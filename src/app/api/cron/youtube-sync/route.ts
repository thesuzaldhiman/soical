import { NextRequest, NextResponse } from 'next/server';
import { runAllActiveYouTubeRules } from '@/lib/services/youtube-sync-service';

export async function GET(request: NextRequest) {
  return handleYouTubeCron(request);
}

export async function POST(request: NextRequest) {
  return handleYouTubeCron(request);
}

async function handleYouTubeCron(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const expectedSecret = process.env.CRON_SECRET || 'sap_live_secret_k8f93a7d2b0e';

  const providedSecret =
    searchParams.get('key') ||
    searchParams.get('secret') ||
    request.headers.get('x-cron-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  const isDev = process.env.NODE_ENV !== 'production';

  if (!isDev && providedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json(
      { success: false, error: 'Forbidden. Invalid cron authorization secret.' },
      { status: 403 }
    );
  }

  try {
    const { totalRules, totalProcessed } = await runAllActiveYouTubeRules();
    return NextResponse.json({
      success: true,
      totalRulesChecked: totalRules,
      totalVideosProcessed: totalProcessed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Cron execution failed';
    console.error('[Cron YouTube Sync] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
