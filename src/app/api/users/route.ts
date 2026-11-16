import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { INITIAL_USER } from '@/lib/state/mock-data';
import { User, SubscriptionTier, UserSubscription } from '@/types';

// Helper to determine if an email belongs to super admin
const isOwnerEmail = (email: string) => {
  const clean = email.toLowerCase().trim();
  return clean === 'me.sumitji@gmail.com' || clean === 'suzaldhiman@gmail.com';
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

// GET: Retrieve registered user for Auth synchronization
export async function GET() {
  const pool = getDbPool();

  if (!pool) {
    return NextResponse.json({
      success: true,
      users: [INITIAL_USER],
      source: 'fallback',
    });
  }

  try {
    await initDbTables();

    // Actively purge rogue unauthorized users from MySQL
    await pool.query("DELETE FROM app_users WHERE LOWER(TRIM(email)) NOT IN ('me.sumitji@gmail.com', 'suzaldhiman@gmail.com')");
    await pool.query("DELETE FROM app_user_data WHERE LOWER(TRIM(email)) NOT IN ('me.sumitji@gmail.com', 'suzaldhiman@gmail.com')");

    const [rows] = await pool.query<any[]>(
      "SELECT * FROM app_users WHERE LOWER(TRIM(email)) IN ('me.sumitji@gmail.com', 'suzaldhiman@gmail.com') ORDER BY (LOWER(TRIM(email)) = 'me.sumitji@gmail.com') DESC"
    );

    const users: User[] = (rows && rows.length > 0) ? rows.map(mapRowToUser) : [INITIAL_USER];

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

    // 1. LOGIN
    if (action === 'login') {
      const { email: rawEmail, password } = body;
      if (!rawEmail || !rawEmail.includes('@')) {
        return NextResponse.json({ success: false, message: 'Valid email required' }, { status: 400 });
      }

      const email = rawEmail.toLowerCase().trim();
      if (!isOwnerEmail(email)) {
        return NextResponse.json(
          {
            success: false,
            code: 'ACCESS_RESTRICTED',
            message: 'Access restricted. Only authorized workspace accounts are permitted.',
          },
          { status: 403 }
        );
      }

      const isOwner = true;

      if (pool) {
        await initDbTables();
        const [rows] = await pool.query<any[]>(
          'SELECT * FROM app_users WHERE LOWER(email) = LOWER(?) LIMIT 1',
          [email]
        );

        if (!rows || rows.length === 0) {
          // If super admin and not in DB, create on the fly
          if (isOwner) {
            const userToReturn = email === 'me.sumitji@gmail.com' ? INITIAL_USER : (INITIAL_ALL_USERS.find((u) => u.email === email) || INITIAL_USER);
            return NextResponse.json({
              success: true,
              user: userToReturn,
              message: 'Workspace owner signed in successfully',
            });
          }
          return NextResponse.json(
            {
              success: false,
              code: 'USER_NOT_FOUND',
              message: 'No account found with this email. Please check your credentials.',
            },
            { status: 404 }
          );
        }

        const userRow = rows[0];
        const userObj = mapRowToUser(userRow);

        // Password verification
        const expectedPass = email === 'me.sumitji@gmail.com' ? 'sumit1234' : 'janusd11';
        const validPass = userRow.password || expectedPass;
        if (password !== validPass && password !== expectedPass) {
          return NextResponse.json(
            { success: false, message: 'Incorrect password. Please try again.' },
            { status: 401 }
          );
        }

        // Approval checks for non-owners
        if (userObj.role !== 'owner' && !isOwner) {
          if (userObj.approvalStatus === 'pending') {
            return NextResponse.json(
              {
                success: false,
                code: 'PENDING_APPROVAL',
                message:
                  'Aapka account abhi Admin approval ke liye pending hai. Admin dwara approve hone ke baad hi aap login kar payenge.',
              },
              { status: 403 }
            );
          }
          if (userObj.approvalStatus === 'suspended') {
            return NextResponse.json(
              {
                success: false,
                code: 'SUSPENDED',
                message:
                  'Aapka account temporarily suspend kar diya gaya hai. Kripya admin se sampark karein.',
              },
              { status: 403 }
            );
          }
          if (userObj.approvalStatus === 'rejected') {
            return NextResponse.json(
              {
                success: false,
                code: 'REJECTED',
                message: `Aapka registration request admin dwara decline kar diya gaya hai${
                  userObj.rejectionReason ? ': ' + userObj.rejectionReason : '.'
                }`,
              },
              { status: 403 }
            );
          }
        }

        // Update last login timestamp
        try {
          await pool.query('UPDATE app_users SET last_login_at = NOW() WHERE id = ?', [userRow.id]);
        } catch {}

        return NextResponse.json({
          success: true,
          user: userObj,
          message: 'Signed in successfully!',
        });
      }

      // Offline / fallback mode
      if (password !== 'janusd11') {
        return NextResponse.json(
          { success: false, message: 'Incorrect password. Please try again.' },
          { status: 401 }
        );
      }
      const expectedPass = email === 'me.sumitji@gmail.com' ? 'sumit1234' : 'janusd11';
      if (password === expectedPass) {
        const fallbackUser = email === 'me.sumitji@gmail.com' ? INITIAL_USER : (INITIAL_ALL_USERS.find((u) => u.email === email) || INITIAL_USER);
        return NextResponse.json({ success: true, user: fallbackUser, message: 'Signed in as owner (offline fallback)' });
      }
      return NextResponse.json(
        { success: false, message: 'Database connection offline. Please check your credentials.' },
        { status: 503 }
      );
    }

    // 2. REGISTRATION (Closed - Private Workspace System)
    if (action === 'register') {
      return NextResponse.json(
        {
          success: false,
          code: 'REGISTRATION_CLOSED',
          message: 'Public registration is closed. This system is private to authorized workspace accounts.',
        },
        { status: 403 }
      );
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

    // 6. PROMOTE / DEMOTE USER (Super Admin toggle)
    if (action === 'promote') {
      const { userId, role = 'owner', tier = 'agency' } = body;
      if (!userId) {
        return NextResponse.json({ success: false, message: 'Missing userId' }, { status: 400 });
      }

      const isSuperAdmin = role === 'owner';
      const targetTier = isSuperAdmin ? 'agency' : tier || 'pro';
      const subData: UserSubscription = {
        tier: targetTier,
        status: 'active',
        expiresAt: null,
        maxConnectedPages: targetTier === 'agency' ? 50 : 15,
        maxDailyPosts: targetTier === 'agency' ? 500 : 100,
        features: {
          canUseAI: true,
          canUseBulkScheduler: true,
          canUseAutomationFeed: isSuperAdmin || targetTier === 'agency',
          canUseAnalytics: true,
        },
      };

      if (pool) {
        await initDbTables();
        await pool.query(
          `UPDATE app_users SET
            role = ?,
            subscription_tier = ?,
            subscription_data = ?,
            approval_status = 'approved'
          WHERE id = ?`,
          [role, targetTier, JSON.stringify(subData), userId]
        );
      }

      return NextResponse.json({
        success: true,
        message: isSuperAdmin
          ? 'User promoted to Super Admin successfully!'
          : 'User demoted to Member successfully',
      });
    }

    // 7. DELETE USER (Complete database & cache purge)
    if (action === 'delete') {
      const { userId, email } = body;
      if (!userId && !email) {
        return NextResponse.json({ success: false, message: 'Missing userId or email' }, { status: 400 });
      }

      if (pool) {
        await initDbTables();

        // 1. Resolve email if only userId was provided
        let targetEmail = email ? email.toLowerCase().trim() : null;
        if (!targetEmail && userId) {
          const [rows] = await pool.query<any[]>('SELECT email FROM app_users WHERE id = ? LIMIT 1', [userId]);
          if (rows && rows.length > 0 && rows[0].email) {
            targetEmail = rows[0].email.toLowerCase().trim();
          }
        }

        // 2. Prevent accidental deletion of primary owner
        if (targetEmail === 'suzaldhiman@gmail.com') {
          return NextResponse.json(
            { success: false, message: 'Primary Super Admin cannot be deleted.' },
            { status: 403 }
          );
        }

        // 3. Delete from all database tables
        if (userId) {
          await pool.query('DELETE FROM app_users WHERE id = ?', [userId]);
        }
        if (targetEmail) {
          await pool.query('DELETE FROM app_users WHERE LOWER(email) = LOWER(?)', [targetEmail]);
          await pool.query('DELETE FROM app_user_data WHERE LOWER(email) = LOWER(?)', [targetEmail]);
          await pool.query('DELETE FROM app_password_resets WHERE LOWER(email) = LOWER(?)', [targetEmail]);
        }
      }

      return NextResponse.json({ success: true, message: 'User completely deleted from database.' });
    }

    return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    console.error('[MySQL Users POST] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
