import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, initDbTables } from '@/lib/db/mysql';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawEmail = searchParams.get('email');

  if (!rawEmail || !rawEmail.includes('@')) {
    return NextResponse.json({ success: false, error: 'Valid email parameter required' }, { status: 400 });
  }

  const email = rawEmail.toLowerCase().trim();
  const pool = getDbPool();

  if (!pool) {
    // If DB is not configured, gracefully let client use local cache
    return NextResponse.json({ success: true, data: null, source: 'no_db_configured' });
  }

  try {
    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM app_user_data WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, data: null, source: 'mysql_empty' });
    }

    const row = rows[0];
    const parseJson = (val: any) => {
      if (!val) return null;
      if (typeof val === 'object') return val;
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    };

    const data = {
      workspace: parseJson(row.workspace),
      accounts: parseJson(row.accounts) || [],
      pages: parseJson(row.pages) || [],
      categories: parseJson(row.categories),
      posts: parseJson(row.posts) || [],
      sigTemplates: parseJson(row.sig_templates),
      pageAnalytics: parseJson(row.page_analytics) || {},
      postPerformances: parseJson(row.post_performances) || [],
      postComments: parseJson(row.post_comments) || [],
      automations: parseJson(row.automations) || [],
      settings: parseJson(row.settings),
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ success: true, data, source: 'mysql' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database query error';
    console.error('[MySQL Sync GET] Error fetching user data:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email: rawEmail, payload, user } = body;

    if (!rawEmail || !rawEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email required' }, { status: 400 });
    }

    const email = rawEmail.toLowerCase().trim();
    const pool = getDbPool();

    if (!pool) {
      return NextResponse.json({ success: true, synced: false, message: 'DB not connected' });
    }

    await initDbTables();

    // 1. Upsert into app_users if user details provided
    if (user && user.email) {
      await pool.query(
        `INSERT INTO app_users (id, email, name, avatar, role, approval_status, provider)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           avatar = VALUES(avatar),
           role = VALUES(role),
           approval_status = VALUES(approval_status)`,
        [
          user.id || `u_${Date.now()}`,
          email,
          user.name || email.split('@')[0],
          user.avatar || '',
          user.role || 'owner',
          user.approvalStatus || 'approved',
          user.provider || 'google',
        ]
      );
    }

    // 2. Upsert user data
    if (payload) {
      const toJson = (val: any) => (val !== undefined ? JSON.stringify(val) : null);

      await pool.query(
        `INSERT INTO app_user_data (
          email, workspace, accounts, pages, categories, posts,
          sig_templates, page_analytics, post_performances, post_comments,
          automations, settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          workspace = VALUES(workspace),
          accounts = VALUES(accounts),
          pages = VALUES(pages),
          categories = VALUES(categories),
          posts = VALUES(posts),
          sig_templates = VALUES(sig_templates),
          page_analytics = VALUES(page_analytics),
          post_performances = VALUES(post_performances),
          post_comments = VALUES(post_comments),
          automations = VALUES(automations),
          settings = VALUES(settings)`,
        [
          email,
          toJson(payload.workspace),
          toJson(payload.accounts || []),
          toJson(payload.pages || []),
          toJson(payload.categories),
          toJson(payload.posts || []),
          toJson(payload.sigTemplates),
          toJson(payload.pageAnalytics || {}),
          toJson(payload.postPerformances || []),
          toJson(payload.postComments || []),
          toJson(payload.automations || []),
          toJson(payload.settings),
        ]
      );
    }

    return NextResponse.json({ success: true, synced: true, timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database save error';
    console.error('[MySQL Sync POST] Error saving user data:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
