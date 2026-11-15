import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { AutomationFeed } from '@/types';

function parseAutomations(raw: any): AutomationFeed[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function resolveEmail(request: NextRequest, bodyEmail?: string): string {
  if (bodyEmail && bodyEmail.includes('@')) {
    return bodyEmail.toLowerCase().trim();
  }
  const urlEmail = request.nextUrl.searchParams.get('email');
  if (urlEmail && urlEmail.includes('@')) {
    return urlEmail.toLowerCase().trim();
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
 * GET /api/automations?email=...
 * Fetch authoritative user automations directly from MySQL app_user_data
 */
export async function GET(request: NextRequest) {
  const email = resolveEmail(request);
  const pool = getDbPool();

  if (!pool) {
    return NextResponse.json({ success: true, automations: [], source: 'no_db_configured' });
  }

  try {
    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT automations FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0 || !rows[0].automations) {
      return NextResponse.json({ success: true, automations: [], source: 'mysql_empty' });
    }

    const automations = parseAutomations(rows[0].automations);
    return NextResponse.json({ success: true, automations, source: 'mysql' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database error';
    console.error('[API Automations GET] Error querying automations:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * POST /api/automations
 * Body: { email, automation: AutomationFeed } or { email, automations: AutomationFeed[] }
 * Atomically inserts or upserts automation rules into MySQL app_user_data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = resolveEmail(request, body.email);
    const incoming: AutomationFeed[] = Array.isArray(body.automations)
      ? body.automations
      : body.automation
      ? [body.automation]
      : [];

    if (incoming.length === 0) {
      return NextResponse.json({ success: false, error: 'automation or automations required' }, { status: 400 });
    }

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ success: true, message: 'DB not connected' });
    }

    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT automations FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    const currentAutomations = rows && rows.length > 0 ? parseAutomations(rows[0].automations) : [];
    const incomingMap = new Map<string, AutomationFeed>();
    incoming.forEach((a) => {
      if (a && a.id) incomingMap.set(a.id, a);
    });

    const updated = [
      ...currentAutomations.map((a) => (incomingMap.has(a.id) ? incomingMap.get(a.id)! : a)),
      ...incoming.filter((a) => !currentAutomations.some((ca) => ca.id === a.id)),
    ];

    if (!rows || rows.length === 0) {
      await pool.query(
        'INSERT INTO app_user_data (email, automations, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE automations = VALUES(automations), updated_at = NOW()',
        [email, JSON.stringify(updated)]
      );
    } else {
      await pool.query(
        'UPDATE app_user_data SET automations = ?, updated_at = NOW() WHERE email = ?',
        [JSON.stringify(updated), email]
      );
    }

    return NextResponse.json({ success: true, automations: updated, count: updated.length });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database error';
    console.error('[API Automations POST] Error inserting automation:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * PUT /api/automations
 * Body: { email, id, updates }
 * Atomically updates a single automation rule in MySQL
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;
    const email = resolveEmail(request, body.email);

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ success: true, message: 'DB not connected' });
    }

    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT automations FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User data not found' }, { status: 404 });
    }

    const currentAutomations = parseAutomations(rows[0].automations);
    let ruleFound = false;
    let updatedRule: AutomationFeed | null = null;

    const newAutomations = currentAutomations.map((a) => {
      if (a.id === id) {
        ruleFound = true;
        updatedRule = { ...a, ...updates };
        return updatedRule;
      }
      return a;
    });

    if (!ruleFound) {
      return NextResponse.json({ success: false, error: `Automation rule ${id} not found` }, { status: 404 });
    }

    await pool.query(
      'UPDATE app_user_data SET automations = ?, updated_at = NOW() WHERE email = ?',
      [JSON.stringify(newAutomations), email]
    );

    return NextResponse.json({
      success: true,
      message: 'Automation rule updated in database successfully',
      automation: updatedRule,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database error';
    console.error('[API Automations PUT] Error updating automation:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * DELETE /api/automations
 * Body or query: { email, id }
 * Permanently deletes specified automation rule from MySQL
 */
export async function DELETE(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const searchParams = request.nextUrl.searchParams;
    const ruleId = body.id || searchParams.get('id');
    const email = resolveEmail(request, body.email);

    if (!ruleId) {
      return NextResponse.json({ success: false, error: 'Automation id is required' }, { status: 400 });
    }

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ success: true, message: 'DB not connected' });
    }

    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT automations FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, remainingCount: 0 });
    }

    const currentAutomations = parseAutomations(rows[0].automations);
    const remaining = currentAutomations.filter((a) => a.id !== ruleId);

    await pool.query(
      'UPDATE app_user_data SET automations = ?, updated_at = NOW() WHERE email = ?',
      [JSON.stringify(remaining), email]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully deleted automation rule from database`,
      remainingCount: remaining.length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database error';
    console.error('[API Automations DELETE] Error deleting automation:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
