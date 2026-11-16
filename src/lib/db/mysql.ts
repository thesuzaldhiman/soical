import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let tablesInitialized = false;

export function getDbPool(): mysql.Pool | null {
  if (pool) return pool;

  // Hostinger MySQL credentials from environment
  // Always use 127.0.0.1 to avoid IPv6 ::1 resolution on Hostinger Linux
  const host = (process.env.DB_HOST || '127.0.0.1').replace('localhost', '127.0.0.1');
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'u941411339_3O7Wx';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'u941411339_erFjE';

  if (!password) {
    console.warn('[MySQL] DB_PASSWORD is not set. Cloud database syncing disabled.');
    return null;
  }

  try {
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
    return pool;
  } catch (err) {
    console.error('[MySQL] Pool creation failed:', err);
    return null;
  }
}

export async function initDbTables(): Promise<boolean> {
  if (tablesInitialized) return true;
  const p = getDbPool();
  if (!p) return false;

  try {
    const connection = await p.getConnection();
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS app_users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255),
          avatar TEXT,
          role VARCHAR(50) DEFAULT 'member',
          approval_status VARCHAR(50) DEFAULT 'pending',
          provider VARCHAR(50) DEFAULT 'email',
          password VARCHAR(255) NULL,
          subscription_tier VARCHAR(50) DEFAULT 'starter',
          subscription_data LONGTEXT NULL,
          rejection_reason TEXT NULL,
          last_login_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Safe column migrations in case table was created with older schema
      const addColumnIfNotExists = async (col: string, def: string) => {
        try {
          const [cols] = await connection.query<any[]>(`SHOW COLUMNS FROM app_users LIKE ?`, [col]);
          if (!cols || cols.length === 0) {
            await connection.query(`ALTER TABLE app_users ADD COLUMN ${col} ${def}`);
          }
        } catch (e) {
          console.warn(`[MySQL] Note on adding column ${col}:`, e);
        }
      };

      await addColumnIfNotExists('password', 'VARCHAR(255) NULL');
      await addColumnIfNotExists('subscription_tier', "VARCHAR(50) DEFAULT 'starter'");
      await addColumnIfNotExists('subscription_data', 'LONGTEXT NULL');
      await addColumnIfNotExists('rejection_reason', 'TEXT NULL');
      await addColumnIfNotExists('last_login_at', 'TIMESTAMP NULL');

      // Ensure Super Admin user (Suzal Dhiman - suzaldhiman@gmail.com) exists with password 'janusd11'
      await connection.query(`
        INSERT INTO app_users (id, email, name, avatar, role, approval_status, provider, password, subscription_tier)
        VALUES ('usr_01', 'suzaldhiman@gmail.com', 'Suzal Dhiman', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80', 'owner', 'approved', 'email', 'janusd11', 'agency')
        ON DUPLICATE KEY UPDATE
          name = 'Suzal Dhiman',
          role = 'owner',
          approval_status = 'approved',
          provider = 'email',
          password = 'janusd11',
          subscription_tier = 'agency';
      `);

      // Ensure Sumit (me.sumitji@gmail.com) exists with password 'sumit1234' and approved status
      const sumitSubscription = {
        tier: 'agency',
        status: 'active',
        expiresAt: null,
        maxConnectedPages: 50,
        maxDailyPosts: 500,
        features: {
          canUseAI: true,
          canUseBulkScheduler: true,
          canUseAutomationFeed: true,
          canUseAnalytics: true,
        },
      };

      await connection.query(`
        INSERT INTO app_users (id, email, name, avatar, role, approval_status, provider, password, subscription_tier, subscription_data)
        VALUES (
          'usr_sumit',
          'me.sumitji@gmail.com',
          'Sumit',
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
          'member',
          'approved',
          'email',
          'sumit1234',
          'agency',
          ?
        )
        ON DUPLICATE KEY UPDATE
          name = 'Sumit',
          password = 'sumit1234',
          approval_status = 'approved',
          role = 'member',
          subscription_tier = 'agency',
          subscription_data = ?;
      `, [JSON.stringify(sumitSubscription), JSON.stringify(sumitSubscription)]);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS app_user_data (
          email VARCHAR(255) PRIMARY KEY,
          workspace LONGTEXT,
          accounts LONGTEXT,
          pages LONGTEXT,
          categories LONGTEXT,
          posts LONGTEXT,
          sig_templates LONGTEXT,
          page_analytics LONGTEXT,
          post_performances LONGTEXT,
          post_comments LONGTEXT,
          automations LONGTEXT,
          settings LONGTEXT,
          logs LONGTEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Ensure clean, fully-isolated user data row exists for me.sumitji@gmail.com
      await connection.query(`
        INSERT IGNORE INTO app_user_data (
          email, workspace, accounts, pages, categories, posts, sig_templates, page_analytics, post_performances, post_comments, automations, settings, logs
        ) VALUES (
          'me.sumitji@gmail.com',
          ?,
          '[]',
          '[]',
          '[]',
          '[]',
          '[]',
          '{}',
          '[]',
          '[]',
          '[]',
          ?,
          '[]'
        );
      `, [
        JSON.stringify({
          id: 'ws_sumitji',
          name: "Sumit Ji's Workspace",
          slug: 'workspace',
          plan: 'agency',
          monthlyPostsLimit: 1500,
          monthlyPostsUsed: 0,
          connectedChannelsLimit: 50,
        }),
        JSON.stringify({
          metaApps: [],
          openaiApiKey: '',
          antiBanLevel: 'balanced',
          autoHashtags: true,
          linkShortener: true,
        })
      ]);

      // Safe column migration for logs in app_user_data
      try {
        const [logCols] = await connection.query<any[]>(`SHOW COLUMNS FROM app_user_data LIKE 'logs'`);
        if (!logCols || logCols.length === 0) {
          await connection.query(`ALTER TABLE app_user_data ADD COLUMN logs LONGTEXT NULL`);
        }
      } catch (e) {
        console.warn(`[MySQL] Note on adding logs column:`, e);
      }

      // Safe table creation for wp_plugins catalog
      await connection.query(`
        CREATE TABLE IF NOT EXISTS wp_plugins (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL,
          download_url VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS app_password_resets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (email),
          INDEX (token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS app_media_storage (
          id VARCHAR(255) PRIMARY KEY,
          mime_type VARCHAR(64) NOT NULL,
          data LONGBLOB NOT NULL,
          size_bytes INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Safe multi-tenant cleanup: Ensure non-owner accounts never hold leaked credentials from suzaldhiman@gmail.com
      try {
        const [nonOwnerRows] = await connection.query<any[]>(
          `SELECT email, settings FROM app_user_data WHERE LOWER(TRIM(email)) != 'suzaldhiman@gmail.com'`
        );
        for (const uRow of nonOwnerRows || []) {
          if (!uRow.settings) continue;
          let parsedSettings: any = null;
          try {
            parsedSettings = typeof uRow.settings === 'object' ? uRow.settings : JSON.parse(uRow.settings);
          } catch {}
          if (parsedSettings && Array.isArray(parsedSettings.metaApps)) {
            const hasLeakedApps = parsedSettings.metaApps.some(
              (a: any) =>
                a.appId === '933161523075809' ||
                a.appId === '853147413771186' ||
                a.name === 'rahul  App' ||
                a.name === 'suzal app'
            );
            if (hasLeakedApps || uRow.email.toLowerCase().trim() === 'me.sumitji@gmail.com') {
              const cleanApps = parsedSettings.metaApps.filter(
                (a: any) =>
                  a.appId !== '933161523075809' &&
                  a.appId !== '853147413771186' &&
                  a.name !== 'rahul  App' &&
                  a.name !== 'suzal app'
              );
              parsedSettings.metaApps = cleanApps;
              if (
                parsedSettings.metaAppId === '933161523075809' ||
                parsedSettings.metaAppId === '853147413771186'
              ) {
                parsedSettings.metaAppId = '';
                parsedSettings.metaAppSecret = '';
              }
              await connection.query(`UPDATE app_user_data SET settings = ? WHERE email = ?`, [
                JSON.stringify(parsedSettings),
                uRow.email,
              ]);
            }
          }
        }
      } catch (cleanErr) {
        console.warn('[MySQL] Non-owner credential isolation cleanup note:', cleanErr);
      }

      tablesInitialized = true;
      console.log('[MySQL] Database tables successfully initialized.');
      return true;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('[MySQL] Failed to initialize tables:', err);
    return false;
  }
}

/**
 * Saves binary media buffer to MySQL app_media_storage table.
 */
export async function saveMediaToDb(id: string, mimeType: string, buffer: Buffer): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) return false;
  try {
    const cleanId = id.replace(/^\/+/, '').trim();
    await pool.query(
      `INSERT INTO app_media_storage (id, mime_type, data, size_bytes)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type), data = VALUES(data), size_bytes = VALUES(size_bytes)`,
      [cleanId, mimeType, buffer, buffer.length]
    );
    return true;
  } catch (err) {
    console.warn('[MySQL Media Storage] Save failed:', err);
    return false;
  }
}

/**
 * Retrieves binary media buffer from MySQL app_media_storage table.
 */
export async function getMediaFromDb(id: string): Promise<{ mimeType: string; data: Buffer } | null> {
  const pool = getDbPool();
  if (!pool) return null;
  try {
    const cleanId = id.replace(/^\/+/, '').trim();
    const [rows] = await pool.query<any[]>(
      'SELECT mime_type, data FROM app_media_storage WHERE id = ? LIMIT 1',
      [cleanId]
    );
    if (!rows || rows.length === 0) return null;
    return {
      mimeType: rows[0].mime_type || 'application/octet-stream',
      data: Buffer.from(rows[0].data),
    };
  } catch (err) {
    console.warn('[MySQL Media Storage] Fetch failed:', err);
    return null;
  }
}
