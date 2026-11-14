import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { INITIAL_USER } from '@/lib/state/mock-data';
import { User, SubscriptionTier, UserSubscription } from '@/types';

// Helper to determine if an email belongs to super admin
const isOwnerEmail = (email: string) => {
  const clean = email.toLowerCase().trim();
  return (
    clean === 'suzaldhiman@gmail.com' ||
    clean === 'suzal@khabarmonkey.com' ||
    clean.includes('suzal') ||
    clean.includes('khabarmonkey') ||
    clean.startsWith('admin@')
  );
};

// Map DB row to TypeScript User interface
function mapRowToUser(row: any): User {
  let subData = null;
  if (row.subscription_data) {
    try {
      subData = typeof row.subscription_data === 'string'
        ? JSON.parse(row.subscription_data)
        : row.subscription_data;
    } catch {}
  }

  const tier = (row.subscription_tier || 'starter') as SubscriptionTier;

  return {
    id: row.id,
    name: row.name || row.email.split('@')[0],
    email: row.email,
    avatar: row.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: (row.role || (isOwnerEmail(row.email) ? 'owner' : 'member')) as any,
    approvalStatus: (row.approval_status || (isOwnerEmail(row.email) ? 'approved' : 'pending')) as any,
    provider: (row.provider || 'email') as any,
    rejectionReason: row.rejection_reason || undefined,
    password: row.password || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : undefined,
    subscription: subData || {
      tier,
      status: row.approval_status === 'approved' ? 'active' : 'trial',
      expiresAt: null,
      maxConnectedPages: tier === 'agency' ? 50 : tier === 'pro' ? 15 : 5,
      maxDailyPosts: tier === 'agency' ? 500 : tier === 'pro' ? 100 : 30,
      features: {
        canUseAI: true,
        canUseBulkScheduler: tier !== 'free',
        canUseAutomationFeed: tier === 'agency',
        canUseAnalytics: true,
      },
    },
  };
}

// GET: Retrieve all registered users for Admin panel and Auth synchronization
export async function GET() {
  const pool = getDbPool();

  if (!pool) {
    // If DB is offline / not yet connected, return super admin user
    return NextResponse.json({
      success: true,
      users: [INITIAL_USER],
      source: 'fallback',
    });
  }

  try {
    await initDbTables();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM app_users ORDER BY created_at DESC'
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        users: [INITIAL_USER],
        source: 'mysql_empty',
      });
    }

    const users: User[] = rows.map(mapRowToUser);

    // Make sure owner always exists in the returned list
    if (!users.some((u) => isOwnerEmail(u.email))) {
      users.unshift(INITIAL_USER);
    }

    return NextResponse.json({
      success: true,
      users,
      source: 'mysql',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database query error';
    console.error('[MySQL Users GET] Error:', message);
    return NextResponse.json({
      success: true,
      users: [INITIAL_USER],
      error: message,
    });
  }
}

// POST: Handle user registration, approval, rejection, and updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const pool = getDbPool();

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 });
    }

    // 1. REGISTRATION
    if (action === 'register') {
      const { name, email: rawEmail, password, tierPreference } = body;
      if (!rawEmail || !rawEmail.includes('@')) {
        return NextResponse.json({ success: false, message: 'Valid email required' }, { status: 400 });
      }

      const email = rawEmail.toLowerCase().trim();
      const isOwner = isOwnerEmail(email);
      const role = isOwner ? 'owner' : 'member';
      const approvalStatus = isOwner ? 'approved' : 'pending';
      const tier = isOwner ? 'agency' : tierPreference || 'starter';
      const userId = `usr_${Date.now()}`;
      const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';

      const subscriptionData: UserSubscription = {
        tier,
        status: isOwner ? 'active' : 'trial',
        expiresAt: null,
        maxConnectedPages: tier === 'agency' ? 50 : tier === 'pro' ? 15 : 5,
        maxDailyPosts: tier === 'agency' ? 500 : tier === 'pro' ? 100 : 30,
        features: {
          canUseAI: true,
          canUseBulkScheduler: tier !== 'free',
          canUseAutomationFeed: tier === 'agency',
          canUseAnalytics: true,
        },
      };

      if (pool) {
        await initDbTables();

        // Check if user already exists in DB
        const [existing] = await pool.query<any[]>(
          'SELECT email FROM app_users WHERE email = ? LIMIT 1',
          [email]
        );

        if (existing && existing.length > 0) {
          return NextResponse.json({
            success: false,
            message: 'This email is already registered. Please sign in.',
          }, { status: 409 });
        }

        await pool.query(
          `INSERT INTO app_users (
            id, email, name, avatar, role, approval_status, provider,
            password, subscription_tier, subscription_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            email,
            name?.trim() || email.split('@')[0],
            defaultAvatar,
            role,
            approvalStatus,
            'email',
            password || null,
            tier,
            JSON.stringify(subscriptionData),
          ]
        );
      }

      const createdUser: User = {
        id: userId,
        name: name?.trim() || email.split('@')[0],
        email,
        avatar: defaultAvatar,
        role,
        approvalStatus,
        provider: 'email',
        password,
        createdAt: new Date().toISOString(),
        subscription: subscriptionData,
      };

      return NextResponse.json({
        success: true,
        isPending: !isOwner,
        user: createdUser,
        message: isOwner
          ? 'Super Admin registered successfully!'
          : 'Registration request submitted. Awaiting admin approval.',
      });
    }

    // 2. APPROVE USER (Admin only)
    if (action === 'approve') {
      const { userId, tier = 'pro', durationDays = 30, maxPages, maxPosts } = body;
      if (!userId) {
        return NextResponse.json({ success: false, message: 'Missing userId' }, { status: 400 });
      }

      const expiresAt = durationDays > 0 ? new Date(Date.now() + durationDays * 86400000).toISOString() : null;
      const subData = {
        tier,
        status: 'active',
        expiresAt,
        maxConnectedPages: maxPages || (tier === 'agency' ? 50 : tier === 'pro' ? 15 : 5),
        maxDailyPosts: maxPosts || (tier === 'agency' ? 500 : tier === 'pro' ? 100 : 30),
        features: {
          canUseAI: true,
          canUseBulkScheduler: tier !== 'free',
          canUseAutomationFeed: tier === 'agency',
          canUseAnalytics: true,
        },
      };

      if (pool) {
        await initDbTables();
        await pool.query(
          `UPDATE app_users SET
            approval_status = 'approved',
            subscription_tier = ?,
            subscription_data = ?,
            rejection_reason = NULL
          WHERE id = ?`,
          [tier, JSON.stringify(subData), userId]
        );
      }

      return NextResponse.json({ success: true, message: 'User approved successfully' });
    }

    // 3. REJECT USER (Admin only)
    if (action === 'reject') {
      const { userId, reason = 'Registration declined by administrator.' } = body;
      if (!userId) {
        return NextResponse.json({ success: false, message: 'Missing userId' }, { status: 400 });
      }

      if (pool) {
        await initDbTables();
        await pool.query(
          `UPDATE app_users SET
            approval_status = 'rejected',
            rejection_reason = ?
          WHERE id = ?`,
          [reason, userId]
        );
      }

      return NextResponse.json({ success: true, message: 'User registration declined' });
    }

    // 4. SUSPEND / UNSUSPEND USER
    if (action === 'suspend') {
      const { userId, suspended } = body;
      if (!userId) {
        return NextResponse.json({ success: false, message: 'Missing userId' }, { status: 400 });
      }

      const newStatus = suspended ? 'suspended' : 'approved';
      if (pool) {
        await initDbTables();
        await pool.query(
          `UPDATE app_users SET approval_status = ? WHERE id = ?`,
          [newStatus, userId]
        );
      }

      return NextResponse.json({ success: true, message: `User status updated to ${newStatus}` });
    }

    // 5. UPDATE SUBSCRIPTION (Admin only)
    if (action === 'update-subscription') {
      const { userId, subscription } = body;
      if (!userId || !subscription) {
        return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
      }

      if (pool) {
        await initDbTables();
        await pool.query(
          `UPDATE app_users SET
            subscription_tier = ?,
            subscription_data = ?
          WHERE id = ?`,
          [subscription.tier || 'starter', JSON.stringify(subscription), userId]
        );
      }

      return NextResponse.json({ success: true, message: 'Subscription updated' });
    }

    // 6. DELETE USER
    if (action === 'delete') {
      const { userId, email } = body;
      if (!userId && !email) {
        return NextResponse.json({ success: false, message: 'Missing userId or email' }, { status: 400 });
      }

      if (pool) {
        await initDbTables();
        if (userId) {
          await pool.query('DELETE FROM app_users WHERE id = ?', [userId]);
        }
        if (email) {
          await pool.query('DELETE FROM app_users WHERE email = ?', [email]);
          await pool.query('DELETE FROM app_user_data WHERE email = ?', [email]);
        }
      }

      return NextResponse.json({ success: true, message: 'User deleted successfully' });
    }

    return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    console.error('[MySQL Users POST] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
