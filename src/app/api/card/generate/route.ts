import { NextRequest, NextResponse } from 'next/server';
import { generateServerCardImage } from '@/lib/services/server-image-generator';
import { offloadBase64Media, sanitizePostMedia } from '@/lib/utils/media-storage';
import { getDbPool, initDbTables } from '@/lib/db/mysql';
import { DEMO_CATEGORIES, DEMO_PAGES, INITIAL_SIG_TEMPLATES } from '@/lib/state/mock-data';
import { Post, SigTemplate } from '@/types';
import fs from 'fs';
import path from 'path';

function parseJsonSafe(val: any, fallback: any) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      headline,
      featuredImageUrl,
      templateId,
      template: customTemplate,
      category,
      siteName,
      postId,
    } = body;

    if (!headline || typeof headline !== 'string') {
      return NextResponse.json({ success: false, error: 'Headline is required' }, { status: 400 });
    }

    const email = resolveEmail(request, body.email);
    const pool = getDbPool();

    // 1. Resolve template to use
    let templateToUse: SigTemplate | null = customTemplate || null;

    if (!templateToUse && pool) {
      try {
        const [rows] = await pool.query<any[]>(
          'SELECT sig_templates FROM app_user_data WHERE email = ? LIMIT 1',
          [email]
        );
        if (rows && rows.length > 0 && rows[0].sig_templates) {
          const templates: SigTemplate[] = parseJsonSafe(rows[0].sig_templates, []);
          if (templateId) {
            templateToUse = templates.find((t) => t.id === templateId) || null;
          }
          if (!templateToUse) {
            templateToUse =
              templates.find((t) => t.isDefault && t.templateImageUrl) ||
              templates.find((t) => t.templateImageUrl) ||
              templates[0] ||
              null;
          }
        }
      } catch (err) {
        console.warn('[api/card/generate] DB templates query error:', err);
      }
    }

    if (!templateToUse) {
      templateToUse = INITIAL_SIG_TEMPLATES[0];
    }

    // Fallback template frame if needed
    if (!templateToUse.templateImageUrl || templateToUse.templateImageUrl.includes('unsplash.com')) {
      const defaultFrame = '/uploads/media_8c7a84d712a33674.png';
      if (fs.existsSync(path.join(process.cwd(), 'public', 'uploads', 'media_8c7a84d712a33674.png'))) {
        templateToUse = {
          ...templateToUse,
          templateImageUrl: defaultFrame,
        };
      }
    }

    // 2. Generate Server Card Image
    const cardBase64 = await generateServerCardImage({
      headline,
      featuredImageUrl: featuredImageUrl || undefined,
      template: templateToUse,
      category: category || 'News',
      siteName: siteName || 'Himachal Samachar',
    });

    // 3. Offload Base64 to permanent static file URL
    const staticCardUrl = offloadBase64Media(cardBase64) || cardBase64;

    // 4. Optionally update post in database if postId is provided
    if (postId && pool) {
      try {
        const [rows] = await pool.query<any[]>(
          'SELECT posts FROM app_user_data WHERE email = ? LIMIT 1',
          [email]
        );
        if (rows && rows.length > 0 && rows[0].posts) {
          const currentPosts: Post[] = parseJsonSafe(rows[0].posts, []);
          const updated = currentPosts.map((p) => {
            if (p.id === postId) {
              return sanitizePostMedia({
                ...p,
                mediaUrl: staticCardUrl,
                thumbnailUrl: staticCardUrl,
                featuredImageUrl: featuredImageUrl || p.featuredImageUrl || (p.thumbnailUrl !== staticCardUrl ? p.thumbnailUrl : undefined),
                isAiGenerated: true,
                sigTemplateId: templateToUse?.id,
                updatedAt: new Date().toISOString(),
              });
            }
            return p;
          });

          await pool.query(
            'UPDATE app_user_data SET posts = ?, updated_at = NOW() WHERE email = ?',
            [JSON.stringify(updated), email]
          );
        }
      } catch (dbErr) {
        console.warn('[api/card/generate] Failed to update post record:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      cardUrl: staticCardUrl,
      templateUsed: {
        id: templateToUse.id,
        name: templateToUse.name,
        templateImageUrl: templateToUse.templateImageUrl,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Card generation failed';
    console.error('[api/card/generate] Error:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
