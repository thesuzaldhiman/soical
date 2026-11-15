import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { LogEntry } from '@/types';

function parseJsonSafe(val: any, fallback: any = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function resolveEmail(request: NextRequest, explicitEmail?: string): string {
  if (explicitEmail && explicitEmail.includes('@')) {
    return explicitEmail.toLowerCase().trim();
  }

  const queryEmail = request.nextUrl.searchParams.get('email');
  if (queryEmail && queryEmail.includes('@')) {
    return queryEmail.toLowerCase().trim();
  }

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
      if (parsed.email && parsed.email.includes('@')) {
        return parsed.email.toLowerCase().trim();
      }
    } catch {}
  }

  return 'suzaldhiman@gmail.com';
}

/**
 * GET /api/logs?email=...
 * Fetch user's persistent system & dispatch logs from MySQL
 */
export async function GET(request: NextRequest) {
  const email = resolveEmail(request);
  const pool = getDbPool();

  if (!pool) {
    return NextResponse.json({ success: true, logs: [], source: 'no_db' });
  }

  try {
    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT logs FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, logs: [], source: 'mysql_empty' });
    }

    const logs: LogEntry[] = parseJsonSafe(rows[0].logs, []);
    return NextResponse.json({ success: true, logs, source: 'mysql' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database query error';
    console.error('[Logs API GET] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/logs
 * Transactionally append one or more log entries to app_user_data.logs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = resolveEmail(request, body.email);
    const pool = getDbPool();

    if (!pool) {
      return NextResponse.json({ success: true, saved: false, message: 'DB not connected' });
    }

    await initDbTables();

    const incomingLogs: LogEntry[] = Array.isArray(body.logs)
      ? body.logs
      : body.log
      ? [body.log]
      : [];

    if (incomingLogs.length === 0) {
      return NextResponse.json({ success: false, error: 'No logs provided' }, { status: 400 });
    }

    const [rows] = await pool.query<any[]>(
      'SELECT logs FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    const existingLogs: LogEntry[] = rows && rows.length > 0 ? parseJsonSafe(rows[0].logs, []) : [];

    // Map by ID to deduplicate and update
    const logMap = new Map<string, LogEntry>();
    existingLogs.forEach((l) => {
      if (l && l.id) logMap.set(l.id, l);
    });

    incomingLogs.forEach((l) => {
      if (l && l.id) logMap.set(l.id, l);
    });

    // Sort newest first
    const mergedLogs = Array.from(logMap.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    }).slice(0, 1000); // Keep last 1000 logs

    await pool.query(
      `INSERT INTO app_user_data (email, logs)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE logs = VALUES(logs)`,
      [email, JSON.stringify(mergedLogs)]
    );

    return NextResponse.json({
      success: true,
      count: mergedLogs.length,
      newlyAdded: incomingLogs.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error saving logs';
    console.error('[Logs API POST] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/logs
 * Delete a specific log entry by logId or clear all logs for this user
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const email = resolveEmail(request, body.email);
    const pool = getDbPool();

    if (!pool) {
      return NextResponse.json({ success: true, deleted: false, message: 'DB not connected' });
    }

    await initDbTables();

    if (body.clearAll === true) {
      // Clear all logs
      await pool.query(
        'UPDATE app_user_data SET logs = ? WHERE email = ?',
        [JSON.stringify([]), email]
      );
      return NextResponse.json({ success: true, cleared: true, remaining: 0 });
    }

    const { logId } = body;
    if (!logId) {
      return NextResponse.json({ success: false, error: 'logId or clearAll required' }, { status: 400 });
    }

    const [rows] = await pool.query<any[]>(
      'SELECT logs FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, remaining: 0 });
    }

    const existingLogs: LogEntry[] = parseJsonSafe(rows[0].logs, []);
    const filteredLogs = existingLogs.filter((l) => l.id !== logId);

    await pool.query(
      'UPDATE app_user_data SET logs = ? WHERE email = ?',
      [JSON.stringify(filteredLogs), email]
    );

    return NextResponse.json({
      success: true,
      deletedId: logId,
      remaining: filteredLogs.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting log';
    console.error('[Logs API DELETE] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
