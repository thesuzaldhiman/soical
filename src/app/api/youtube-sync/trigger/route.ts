import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db/mysql';
import { YouTubeSyncRule } from '@/types';
import {
  processYouTubeSyncRule,
  executeYouTubeRuleTestPost,
} from '@/lib/services/youtube-sync-service';

function parseJsonSafe<T>(val: unknown, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return val as T;
  try {
    return JSON.parse(String(val)) as T;
  } catch {
    return fallback;
  }
}

/**
 * POST /api/youtube-sync/trigger
 * Triggers video sync or an instant test post for a YouTube rule
 * Supports:
 *  - mode: 'test' -> picks a new video from the channel and publishes it to Facebook
 *  - mode: 'normal' (default) -> runs standard sync for new unposted feed videos
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email = 'suzaldhiman@gmail.com',
      ruleId,
      mode = 'normal',
      videoId,
      targetPageId,
    } = body;

    if (!ruleId) {
      return NextResponse.json({ success: false, error: 'ruleId is required' }, { status: 400 });
    }

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const [rows] = await pool.query<any[]>(
      'SELECT youtube_rules FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0 || !rows[0].youtube_rules) {
      return NextResponse.json({ success: false, error: 'No rules found for user' }, { status: 404 });
    }

    const rules: YouTubeSyncRule[] = parseJsonSafe(rows[0].youtube_rules, []);
    const rule = rules.find((r) => r.id === ruleId);

    if (!rule) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    // ── Mode A: Instant Test Post ("har bar koi new video") ──
    if (mode === 'test' || mode === 'test_post') {
      console.log(`[API YouTube Trigger] Running TEST POST for rule: ${rule.name} (${rule.id})`);
      const testResult = await executeYouTubeRuleTestPost(rule.id, email, {
        videoId,
        targetPageId,
      });

      return NextResponse.json({
        success: testResult.success,
        isTest: true,
        testResult,
        result: {
          ruleId: rule.id,
          ruleName: rule.name,
          processedCount: testResult.success ? 1 : 0,
          skippedCount: 0,
          logs: [testResult.log],
          video: testResult.video,
          targets: testResult.targets,
        },
      });
    }

    // ── Mode B: Standard Live Sync Runner ──
    const ruleToRun: YouTubeSyncRule = {
      ...rule,
      isActive: true,
    };

    console.log(`[API YouTube Trigger] Running standard sync for rule: ${rule.name} (${rule.id})`);
    const syncResult = await processYouTubeSyncRule(ruleToRun, email);

    return NextResponse.json({
      success: true,
      result: syncResult,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Execution failed';
    console.error('[API YouTube Trigger] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
