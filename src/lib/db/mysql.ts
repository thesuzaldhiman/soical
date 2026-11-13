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
          role VARCHAR(50) DEFAULT 'owner',
          approval_status VARCHAR(50) DEFAULT 'approved',
          provider VARCHAR(50) DEFAULT 'google',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

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
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

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
