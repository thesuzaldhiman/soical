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

      // Ensure Owner user (Suzal Dhiman) always exists and is approved in app_users
      await connection.query(`
        INSERT INTO app_users (id, email, name, avatar, role, approval_status, provider, subscription_tier)
        VALUES ('usr_01', 'suzal@khabarmonkey.com', 'Suzal Dhiman', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80', 'owner', 'approved', 'google', 'agency')
        ON DUPLICATE KEY UPDATE
          role = 'owner',
          approval_status = 'approved',
          subscription_tier = 'agency';
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
