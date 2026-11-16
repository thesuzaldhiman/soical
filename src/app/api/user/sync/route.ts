import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { sanitizePostMedia, sanitizeDeepMedia } from '@/lib/utils/media-storage';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let rawEmail = searchParams.get('email');

  if (!rawEmail || !rawEmail.includes('@')) {
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
          rawEmail = parsed.email;
        }
      } catch {}
    }
  }

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

    const rawPosts = parseJson(row.posts) || [];
    const rawTemplates = parseJson(row.sig_templates) || [];
    const rawPerformances = parseJson(row.post_performances) || [];
    const rawLogs = parseJson(row.logs) || [];

    const sanitizedPosts = sanitizeDeepMedia(rawPosts);
    const sanitizedTemplates = sanitizeDeepMedia(rawTemplates);
    const sanitizedPerformances = sanitizeDeepMedia(rawPerformances);
    // Keep latest 150 logs to prevent infinite bloat
    const sanitizedLogs = sanitizeDeepMedia(Array.isArray(rawLogs) ? rawLogs.slice(0, 150) : []);

    const hadBase64 =
      JSON.stringify(sanitizedPosts).length !== JSON.stringify(rawPosts).length ||
      JSON.stringify(sanitizedTemplates).length !== JSON.stringify(rawTemplates).length ||
      JSON.stringify(sanitizedPerformances).length !== JSON.stringify(rawPerformances).length ||
      JSON.stringify(sanitizedLogs).length !== JSON.stringify(rawLogs).length;

    if (hadBase64) {
      pool.query(
        `UPDATE app_user_data 
         SET posts = ?, sig_templates = ?, post_performances = ?, logs = ?, updated_at = NOW() 
         WHERE email = ?`,
        [
          JSON.stringify(sanitizedPosts),
          JSON.stringify(sanitizedTemplates),
          JSON.stringify(sanitizedPerformances),
          JSON.stringify(sanitizedLogs),
          email,
        ]
      ).catch((err) => console.warn('[Sync GET] Background cleanup error:', err));
    }

    const data = {
      workspace: parseJson(row.workspace),
      accounts: parseJson(row.accounts) || [],
      pages: parseJson(row.pages) || [],
      categories: parseJson(row.categories),
      posts: sanitizedPosts,
      sigTemplates: sanitizedTemplates,
      pageAnalytics: parseJson(row.page_analytics) || {},
      postPerformances: sanitizedPerformances,
      postComments: parseJson(row.post_comments) || [],
      automations: parseJson(row.automations) || [],
      settings: parseJson(row.settings),
      logs: sanitizedLogs,
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
    let { email: rawEmail, payload, user } = body;

    if (!rawEmail || !rawEmail.includes('@')) {
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
            rawEmail = parsed.email;
          }
        } catch {}
      }
    }

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

    // 2. Upsert user data with non-destructive, intelligent merging
    if (payload) {
      const toJson = (val: any) => (val !== undefined && val !== null ? JSON.stringify(val) : null);
      const parseField = (val: any, fallback: any) => {
        if (!val) return fallback;
        if (typeof val === 'object') return val;
        try {
          return JSON.parse(val);
        } catch {
          return fallback;
        }
      };

      // Fetch existing DB state to protect against accidental client wipeouts
      let existingRow: any = null;
      try {
        const [existingRows] = await pool.query<any[]>(
          'SELECT * FROM app_user_data WHERE email = ? LIMIT 1',
          [email]
        );
        if (existingRows && existingRows.length > 0) {
          existingRow = existingRows[0];
        }
      } catch (e) {
        console.warn('[MySQL Sync] Error fetching existing row:', e);
      }

      // --- 1. POSTS SAFETY & AUTHORITATIVE UPDATE ---
      const dbPosts: any[] = existingRow ? parseField(existingRow.posts, []) : [];
      let finalPosts: any[] = [];
      if (Array.isArray(payload.posts)) {
        // Authoritative posts sent from client session! Deleted posts must stay deleted.
        finalPosts = payload.posts;
      } else if (dbPosts.length > 0) {
        // Fallback only if payload did not include posts array
        finalPosts = dbPosts;
      }

      finalPosts.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.updatedAt || a.publishedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || b.publishedAt || 0).getTime();
        return timeB - timeA;
      });

      finalPosts = finalPosts.map((p) => sanitizePostMedia(p));

      // --- 2. AUTOMATIONS / RULES SAFETY & AUTHORITATIVE UPDATE ---
      const dbAutomations: any[] = existingRow ? parseField(existingRow.automations, []) : [];
      let finalAutomations: any[] = dbAutomations;
      if (Array.isArray(payload.automations)) {
        finalAutomations = payload.automations;
      }

      // --- 3. CATEGORIES SAFETY & AUTHORITATIVE UPDATE ---
      const dbCategories: any[] = existingRow ? parseField(existingRow.categories, []) : [];
      let finalCategories: any[] = dbCategories;
      if (Array.isArray(payload.categories)) {
        // If client explicitly sent categories (even if empty [] when all are deleted), that is authoritative!
        finalCategories = payload.categories;
      }

      // --- 4. SIGNATURE TEMPLATES SAFETY & AUTHORITATIVE UPDATE ---
      const dbTemplates: any[] = existingRow ? parseField(existingRow.sig_templates, []) : [];
      let finalTemplates: any[] = dbTemplates;
      if (Array.isArray(payload.sigTemplates)) {
        finalTemplates = payload.sigTemplates;
      }
      finalTemplates = sanitizeDeepMedia(finalTemplates);

      // --- 5. PAGES & ACCOUNTS SAFETY ---
      const dbPages: any[] = existingRow ? parseField(existingRow.pages, []) : [];
      const finalPages = Array.isArray(payload.pages) ? payload.pages : dbPages;

      const dbAccounts: any[] = existingRow ? parseField(existingRow.accounts, []) : [];
      const finalAccounts = Array.isArray(payload.accounts) ? payload.accounts : dbAccounts;

      // --- 6. SETTINGS SAFETY & MERGING ---
      const dbSettings = existingRow ? parseField(existingRow.settings, {}) : {};
      const finalSettings = {
        ...(dbSettings || {}),
        ...(payload.settings || {}),
        metaApps:
          Array.isArray(payload.settings?.metaApps) && payload.settings.metaApps.length > 0
            ? payload.settings.metaApps
            : dbSettings?.metaApps || [],
      };

      // --- 7. WORKSPACE ---
      const dbWorkspace = existingRow ? parseField(existingRow.workspace, null) : null;
      const finalWorkspace = payload.workspace || dbWorkspace;

      // --- 8. LOGS SAFETY & MERGING ---
      const dbLogs: any[] = existingRow ? parseField(existingRow.logs, []) : [];
      let finalLogs: any[] = [];
      if (Array.isArray(payload.logs) && payload.logs.length > 0) {
        const logMap = new Map<string, any>();
        payload.logs.forEach((l: any) => {
          if (l && l.id) logMap.set(l.id, l);
        });
        finalLogs = [
          ...payload.logs,
          ...dbLogs.filter((l: any) => l && l.id && !logMap.has(l.id)),
        ];
      } else if (dbLogs.length > 0) {
        finalLogs = dbLogs;
      }
      finalLogs.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      });
      finalLogs = sanitizeDeepMedia(finalLogs.slice(0, 150));

      const finalPerformances = sanitizeDeepMedia(
        payload.postPerformances || parseField(existingRow?.post_performances, [])
      );

      await pool.query(
        `INSERT INTO app_user_data (
          email, workspace, accounts, pages, categories, posts,
          sig_templates, page_analytics, post_performances, post_comments,
          automations, settings, logs
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          settings = VALUES(settings),
          logs = VALUES(logs)`,
        [
          email,
          toJson(finalWorkspace),
          toJson(finalAccounts),
          toJson(finalPages),
          toJson(finalCategories),
          toJson(finalPosts),
          toJson(finalTemplates),
          toJson(payload.pageAnalytics || existingRow?.page_analytics || {}),
          toJson(finalPerformances),
          toJson(payload.postComments || existingRow?.post_comments || []),
          toJson(finalAutomations),
          toJson(finalSettings),
          toJson(finalLogs),
        ]
      );

      return NextResponse.json({
        success: true,
        synced: true,
        postsCount: finalPosts.length,
        automationsCount: finalAutomations.length,
        posts: finalPosts,
        automations: finalAutomations,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, synced: true, timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database save error';
    console.error('[MySQL Sync POST] Error saving user data:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
