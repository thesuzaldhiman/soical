import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db/mysql';
import { YouTubeSyncRule, YouTubeSyncLog } from '@/types';

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
 * GET /api/youtube-sync/rules?email=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'suzaldhiman@gmail.com';

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ success: true, rules: [], logs: [] });
    }

    const [rows] = await pool.query<any[]>(
      'SELECT youtube_rules, youtube_logs FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, rules: [], logs: [] });
    }

    const rules: YouTubeSyncRule[] = parseJsonSafe(rows[0].youtube_rules, []);
    const logs: YouTubeSyncLog[] = parseJsonSafe(rows[0].youtube_logs, []);

    return NextResponse.json({ success: true, rules, logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch YouTube rules';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/youtube-sync/rules
 * Save or update a YouTubeSyncRule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email = 'suzaldhiman@gmail.com', rule } = body;

    if (!rule || !rule.id || !rule.channelId) {
      return NextResponse.json(
        { success: false, error: 'Rule object with id and channelId is required' },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const [rows] = await pool.query<any[]>(
      'SELECT youtube_rules FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    let currentRules: YouTubeSyncRule[] = [];
    if (rows && rows.length > 0 && rows[0].youtube_rules) {
      currentRules = parseJsonSafe(rows[0].youtube_rules, []);
    }

    const existingIndex = currentRules.findIndex((r) => r.id === rule.id);
    if (existingIndex >= 0) {
      currentRules[existingIndex] = {
        ...currentRules[existingIndex],
        ...rule,
        updatedAt: new Date().toISOString(),
      };
    } else {
      currentRules.unshift({
        ...rule,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    await pool.query(
      'UPDATE app_user_data SET youtube_rules = ?, updated_at = NOW() WHERE email = ?',
      [JSON.stringify(currentRules), email]
    );

    return NextResponse.json({ success: true, rules: currentRules });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed saving YouTube rule';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/youtube-sync/rules?email=...&id=...
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'suzaldhiman@gmail.com';
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Rule id is required' }, { status: 400 });
    }

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const [rows] = await pool.query<any[]>(
      'SELECT youtube_rules FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows && rows.length > 0 && rows[0].youtube_rules) {
      const currentRules: YouTubeSyncRule[] = parseJsonSafe(rows[0].youtube_rules, []);
      const filtered = currentRules.filter((r) => r.id !== id);

      await pool.query(
        'UPDATE app_user_data SET youtube_rules = ?, updated_at = NOW() WHERE email = ?',
        [JSON.stringify(filtered), email]
      );

      return NextResponse.json({ success: true, rules: filtered });
    }

    return NextResponse.json({ success: true, rules: [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed deleting rule';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
