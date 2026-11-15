import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { PageCategory } from '@/types';

function parseCategories(raw: any): PageCategory[] {
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
 * GET /api/categories?email=...
 * Fetch authoritative user categories directly from MySQL app_user_data
 */
export async function GET(request: NextRequest) {
  const email = resolveEmail(request);
  const pool = getDbPool();

  if (!pool) {
    return NextResponse.json({ success: true, categories: [], source: 'no_db' });
  }

  try {
    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT categories FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, categories: [], source: 'empty_row' });
    }

    const categories = parseCategories(rows[0].categories);
    return NextResponse.json({ success: true, categories, source: 'mysql' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database query error';
    console.error('[Categories API GET] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/categories
 * Upsert or replace categories in MySQL app_user_data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = resolveEmail(request, body.email);
    const pool = getDbPool();

    if (!pool) {
      return NextResponse.json({ success: true, message: 'DB not connected' });
    }

    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT categories FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    const existing: PageCategory[] = rows && rows.length > 0 ? parseCategories(rows[0].categories) : [];
    let updatedCategories: PageCategory[] = [];

    if (Array.isArray(body.categories)) {
      // Direct full replacement
      updatedCategories = body.categories;
    } else if (body.category && typeof body.category === 'object') {
      const cat = body.category as PageCategory;
      const idx = existing.findIndex((c) => c.id === cat.id);
      if (idx >= 0) {
        existing[idx] = cat;
        updatedCategories = existing;
      } else {
        updatedCategories = [...existing, cat];
      }
    } else {
      return NextResponse.json({ success: false, error: 'category or categories required' }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO app_user_data (email, categories)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE categories = VALUES(categories)`,
      [email, JSON.stringify(updatedCategories)]
    );

    return NextResponse.json({ success: true, categories: updatedCategories });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error';
    console.error('[Categories API POST] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/categories
 * Delete a category or categories by ID permanently from MySQL app_user_data
 */
export async function DELETE(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const searchParams = request.nextUrl.searchParams;
    const catId = body.id || searchParams.get('id') || searchParams.get('categoryId');
    const catIds: string[] = Array.isArray(body.ids)
      ? body.ids
      : catId
      ? [catId]
      : [];

    const email = resolveEmail(request, body.email);

    if (catIds.length === 0) {
      return NextResponse.json({ success: false, error: 'id or ids required' }, { status: 400 });
    }

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ success: true, message: 'DB not connected' });
    }

    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT categories FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, remainingCount: 0 });
    }

    const currentCategories: PageCategory[] = parseCategories(rows[0].categories);
    const toDeleteSet = new Set(catIds);
    const remaining = currentCategories.filter((c) => !toDeleteSet.has(c.id));

    await pool.query(
      'UPDATE app_user_data SET categories = ? WHERE email = ?',
      [JSON.stringify(remaining), email]
    );

    return NextResponse.json({
      success: true,
      deletedCount: catIds.length,
      remainingCount: remaining.length,
      categories: remaining,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database delete error';
    console.error('[Categories API DELETE] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
