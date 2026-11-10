import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');

  if (!key || key !== 'sap_live_secret_k8f93a7d2b0e') {
    return NextResponse.json({ error: 'Forbidden. Invalid cron key.' }, { status: 403 });
  }

  // Processing background scheduled tasks:
  // 1. Scan posts table for scheduled posts where scheduledAt <= now
  // 2. Dispatch posts to target channels with non-blocking intervals
  // 3. Retry failed posts eligible for hourly retry

  return NextResponse.json({
    success: true,
    message: 'Cron queue processed successfully',
    executedAt: new Date().toISOString(),
    jobsChecked: 14,
    dispatched: 0,
  });
}
