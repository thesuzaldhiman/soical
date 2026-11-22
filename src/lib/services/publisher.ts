import fs from 'fs';
import path from 'path';
import { getMediaFromDb } from '@/lib/db/mysql';
import { getBaseUrl } from '@/lib/utils/url';

export interface PublishTarget {
  id: string;
  platform: string;
  name: string;
  pageId: string;
  botToken?: string;
  chatId?: string;
  accessToken?: string;
  siteUrl?: string;
  targetUrl?: string;
  bridgeApiKey?: string;
  bridgeType?: string;
  category?: string;
  wpUsername?: string;
  wpAppPassword?: string;
  metaAppId?: string;
  metaAppName?: string;
}

export interface DispatchOptions {
  postType?: 'image' | 'video' | 'text' | 'link';
  title?: string;
  message: string;
  mediaUrl?: string;
  linkUrl?: string;
  commentText?: string;
  contentHtml?: string;
  isAiGenerated?: boolean;
  intervalMinSeconds?: number;
  intervalMaxSeconds?: number;
  targets: PublishTarget[];
}

export interface TargetDispatchResult {
  pageId: string;
  pageName: string;
  platform: string;
  status: 'success' | 'failed';
  externalPostId?: string;
  postUrl?: string;
  commentId?: string;
  commentStatus?: 'success' | 'failed';
  commentError?: string;
  error?: string;
  timestamp: string;
}

/**
 * Robust Facebook First-Comment dispatcher with propagation delay and candidate fallback.
 * Meta Graph API takes 1.5 - 2.5s for newly uploaded photo stories to propagate across edge clusters.
 * Photo uploads can receive comments on either the photo node (id) or the feed story node (post_id).
 */
async function postFacebookCommentSafely(
  targetIds: string[],
  commentText: string,
  accessToken: string,
  pageName: string
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  if (!commentText || !commentText.trim()) {
    return { success: false, error: 'Empty comment text' };
  }

  // 1.8 second delay for Meta Graph cluster propagation
  await new Promise((resolve) => setTimeout(resolve, 1800));

  let lastError = 'No valid target object ID';

  for (const objId of targetIds) {
    if (!objId) continue;
    try {
      const commentForm = new URLSearchParams();
      commentForm.append('message', commentText.trim());
      commentForm.append('access_token', accessToken);

      const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(objId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: commentForm.toString(),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.id) {
        console.log(`[Meta Graph API] First comment posted successfully on object ${objId} (${pageName}): ${data.id}`);
        return { success: true, commentId: String(data.id) };
      }

      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      const errCode = data?.error?.code;
      console.warn(`[Meta Graph API] First comment failed on object ${objId} (${pageName}, code ${errCode}): ${errMsg}`);
      lastError = `${errMsg} (code ${errCode || res.status})`;

      // Wait 1.2s before trying alternative candidate ID
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch (e: any) {
      console.warn(`[Meta Graph API] Comment network error on ${objId}:`, e?.message);
      lastError = e?.message || 'Network exception';
    }
  }

  return { success: false, error: lastError };
}

export async function dispatchToTargets(options: DispatchOptions): Promise<TargetDispatchResult[]> {
  const {
    postType = 'image',
    title = '',
    message = '',
    mediaUrl = '',
    linkUrl = '',
    commentText = '',
    contentHtml = '',
    intervalMinSeconds = 0,
    intervalMaxSeconds = 0,
    targets = [],
  } = options;

  const results: TargetDispatchResult[] = [];
  const minSec = typeof intervalMinSeconds === 'number' ? intervalMinSeconds : 0;
  const maxSec = typeof intervalMaxSeconds === 'number' ? Math.max(minSec, intervalMaxSeconds) : minSec;

  for (let targetIndex = 0; targetIndex < targets.length; targetIndex++) {
    const target = targets[targetIndex];

    // Anti-ban delay between sequential pages
    if (targetIndex > 0) {
      let delaySec = 0;
      if (minSec > 0 || maxSec > 0) {
        delaySec = minSec === maxSec ? minSec : Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
      } else {
        delaySec = 2; // Safe 2s gap between targets to prevent Meta bot detection
      }

      if (delaySec > 0) {
        console.log(`[Anti-Ban Queue] Target ${targetIndex + 1}/${targets.length}: waiting ${delaySec}s before publishing to "${target.name}"...`);
        await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
      }
    }

    const timestamp = new Date().toISOString();

      // 1. TELEGRAM DISPATCH
      if (target.platform === 'telegram') {
        const botToken = target.botToken;
        const chatId = target.chatId || target.pageId;

        if (!botToken || !chatId) {
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'telegram',
            status: 'failed',
            error: 'Missing Telegram Bot Token or Channel Chat ID.',
            timestamp,
          });
          continue;
        }

        try {
          let tgResData: any;

          if (mediaUrl && (postType === 'image' || postType === 'video')) {
            const isBase64 = mediaUrl.startsWith('data:');
            if (isBase64) {
              const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                const mimeType = match[1];
                const buffer = Buffer.from(match[2], 'base64');
                const blob = new Blob([buffer], { type: mimeType });
                const form = new FormData();
                form.append('chat_id', chatId);
                form.append('caption', message.slice(0, 1024));

                if (postType === 'video') {
                  form.append('video', blob, `video_${Date.now()}.mp4`);
                  const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
                    method: 'POST',
                    body: form,
                  });
                  tgResData = await tgRes.json();
                } else {
                  form.append('photo', blob, `photo_${Date.now()}.jpg`);
                  const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                    method: 'POST',
                    body: form,
                  });
                  tgResData = await tgRes.json();
                }
              }
            } else {
              // Public URL
              const endpoint = postType === 'video' ? 'sendVideo' : 'sendPhoto';
              const bodyField = postType === 'video' ? 'video' : 'photo';
              const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  [bodyField]: mediaUrl,
                  caption: message.slice(0, 1024),
                }),
              });
              tgResData = await tgRes.json();
            }
          } else {
            // Send Text Message
            const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: message,
              }),
            });
            tgResData = await tgRes.json();
          }

          if (!tgResData || !tgResData.ok) {
            results.push({
              pageId: target.id,
              pageName: target.name,
              platform: 'telegram',
              status: 'failed',
              error: tgResData?.description || 'Telegram API rejected post.',
              timestamp,
            });
            continue;
          }

          const messageId = tgResData.result.message_id;
          const cleanChat = chatId.replace('@', '');
          const postUrl = chatId.startsWith('@')
            ? `https://t.me/${cleanChat}/${messageId}`
            : `https://t.me/c/${cleanChat.replace('-100', '')}/${messageId}`;

          // Optional First Comment
          if (commentText) {
            try {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: commentText,
                  reply_to_message_id: messageId,
                }),
              });
            } catch {
              // non-blocking
            }
          }

          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'telegram',
            status: 'success',
            externalPostId: String(messageId),
            postUrl,
            timestamp,
          });
        } catch (err: unknown) {
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'telegram',
            status: 'failed',
            error: err instanceof Error ? err.message : 'Network error contacting Telegram API',
            timestamp,
          });
        }
        continue;
      }

      // 2. FACEBOOK GRAPH API DISPATCH
      if (target.platform === 'facebook') {
        const accessToken = target.accessToken;
        const pageId = target.pageId;

        if (!accessToken) {
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'facebook',
            status: 'failed',
            error: 'Missing Facebook Page Access Token.',
            timestamp,
          });
          continue;
        }

        try {
          let fbResData: any;

          if (mediaUrl && (postType === 'image' || postType === 'video')) {
            const isBase64 = mediaUrl.startsWith('data:');

            if (postType === 'video') {
              if (isBase64) {
                const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                  const mimeType = match[1];
                  const buffer = Buffer.from(match[2], 'base64');
                  const blob = new Blob([buffer], { type: mimeType });
                  const form = new FormData();
                  form.append('source', blob, `video_${Date.now()}.mp4`);
                  if (message) form.append('description', message);
                  form.append('access_token', accessToken);

                  const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/videos`, {
                    method: 'POST',
                    body: form,
                  });
                  fbResData = await fbRes.json();
                }
              } else {
                // Check if local file in public directory (e.g. /uploads/...) or MySQL DB
                const cleanRelPath = mediaUrl.replace(/^\/+/, '');
                const localFilePath = path.join(process.cwd(), 'public', cleanRelPath);

                let videoBuffer: Buffer | null = null;
                let videoMime = 'video/mp4';
                let videoExt = 'mp4';

                if (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://')) {
                  if (fs.existsSync(localFilePath)) {
                    videoBuffer = fs.readFileSync(localFilePath);
                    videoExt = path.extname(localFilePath).replace('.', '') || 'mp4';
                    videoMime = `video/${videoExt}`;
                  } else {
                    const filename = path.basename(cleanRelPath);
                    const dbMedia = (await getMediaFromDb(cleanRelPath)) || (await getMediaFromDb(filename));
                    if (dbMedia) {
                      videoBuffer = dbMedia.data;
                      videoMime = dbMedia.mimeType || 'video/mp4';
                      videoExt = videoMime.split('/')[1] || 'mp4';
                    }
                  }
                }

                if (videoBuffer) {
                  const blob = new Blob([new Uint8Array(videoBuffer)], { type: videoMime });
                  const form = new FormData();
                  form.append('source', blob, `video_${Date.now()}.${videoExt}`);
                  if (message) form.append('description', message);
                  form.append('access_token', accessToken);

                  const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/videos`, {
                    method: 'POST',
                    body: form,
                  });
                  fbResData = await fbRes.json();
                } else {
                  // Ensure absolute URL if relative path
                  const absoluteUrl = mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')
                    ? mediaUrl
                    : `${getBaseUrl()}/${cleanRelPath}`;

                  const formData = new URLSearchParams();
                  formData.append('file_url', absoluteUrl);
                  if (message) formData.append('description', message);
                  formData.append('access_token', accessToken);

                  const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/videos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString(),
                  });
                  fbResData = await fbRes.json();
                }
              }
            } else {
              // Photo post
              if (isBase64) {
                const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                  const mimeType = match[1];
                  const buffer = Buffer.from(match[2], 'base64');
                  const blob = new Blob([buffer], { type: mimeType });
                  const form = new FormData();
                  const ext = mimeType.split('/')[1] || 'jpg';
                  form.append('source', blob, `photo_${Date.now()}.${ext}`);
                  if (message) form.append('caption', message);
                  form.append('access_token', accessToken);
                  if (options.isAiGenerated) {
                    form.append('is_ai_generated', 'true');
                  }

                  const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
                    method: 'POST',
                    body: form,
                  });
                  fbResData = await fbRes.json();
                }
              } else {
                // Check if local file in public directory (e.g. /uploads/...) or MySQL DB
                const cleanRelPath = mediaUrl.replace(/^\/+/, '');
                const localFilePath = path.join(process.cwd(), 'public', cleanRelPath);

                let photoBuffer: Buffer | null = null;
                let photoMime = 'image/jpeg';
                let photoExt = 'jpg';

                // 1. Check if local file in public directory (e.g. /uploads/...) or MySQL DB
                let resolvedLocalPath = '';
                let searchRel = cleanRelPath;
                if (mediaUrl.includes('/uploads/')) {
                  searchRel = mediaUrl.substring(mediaUrl.indexOf('/uploads/')).replace(/^\/+/, '');
                  resolvedLocalPath = path.join(process.cwd(), 'public', searchRel);
                } else if (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://')) {
                  resolvedLocalPath = localFilePath;
                }

                if (resolvedLocalPath && fs.existsSync(resolvedLocalPath)) {
                  photoBuffer = fs.readFileSync(resolvedLocalPath);
                  photoExt = path.extname(resolvedLocalPath).replace('.', '') || 'jpg';
                  photoMime = photoExt === 'png' ? 'image/png' : photoExt === 'gif' ? 'image/gif' : photoExt === 'webp' ? 'image/webp' : 'image/jpeg';
                } else {
                  const filename = path.basename(searchRel);
                  const dbMedia = (await getMediaFromDb(searchRel)) || (await getMediaFromDb(filename));
                  if (dbMedia) {
                    photoBuffer = dbMedia.data;
                    photoMime = dbMedia.mimeType || 'image/jpeg';
                    photoExt = photoMime.split('/')[1] || 'jpg';
                  }
                }

                // 2. If remote HTTP/HTTPS, fetch buffer once so Meta doesn't fail crawling the URL externally
                if (!photoBuffer && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'))) {
                  try {
                    const fetchRes = await fetch(mediaUrl, {
                      headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                      },
                      signal: AbortSignal.timeout(10000),
                    });
                    if (fetchRes.ok) {
                      const ab = await fetchRes.arrayBuffer();
                      photoBuffer = Buffer.from(ab);
                      const ct = fetchRes.headers.get('content-type') || '';
                      if (ct.includes('png')) { photoExt = 'png'; photoMime = 'image/png'; }
                      else if (ct.includes('webp')) { photoExt = 'webp'; photoMime = 'image/webp'; }
                      else if (ct.includes('gif')) { photoExt = 'gif'; photoMime = 'image/gif'; }
                      else { photoExt = 'jpg'; photoMime = 'image/jpeg'; }
                    }
                  } catch (e) {
                    console.warn('[publisher] Remote media buffer download failed, fallback to url param:', e);
                  }
                }

                if (photoBuffer) {
                  const blob = new Blob([new Uint8Array(photoBuffer)], { type: photoMime });
                  const form = new FormData();
                  form.append('source', blob, `photo_${Date.now()}.${photoExt}`);
                  if (message) form.append('caption', message);
                  form.append('access_token', accessToken);
                  if (options.isAiGenerated) {
                    form.append('is_ai_generated', 'true');
                  }

                  const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
                    method: 'POST',
                    body: form,
                  });
                  fbResData = await fbRes.json();
                } else {
                  // Ensure absolute URL if relative path
                  const absoluteUrl = mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')
                    ? mediaUrl
                    : `${getBaseUrl()}/${cleanRelPath}`;

                  const formData = new URLSearchParams();
                  formData.append('url', absoluteUrl);
                  if (message) formData.append('caption', message);
                  formData.append('access_token', accessToken);
                  if (options.isAiGenerated) {
                    formData.append('is_ai_generated', 'true');
                  }

                  const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString(),
                  });
                  fbResData = await fbRes.json();
                }
              }
            }
          } else {
            // Post Feed update to Page (Text or Link)
            const formData = new URLSearchParams();
            formData.append('message', message);
            // Only attach 'link' parameter if postType is explicitly 'link' (link_card preview)
            if (linkUrl && postType === 'link') {
              formData.append('link', linkUrl);
            }
            formData.append('access_token', accessToken);

            const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: formData.toString(),
            });
            fbResData = await fbRes.json();
          }

          if (!fbResData || fbResData.error) {
            const metaErr = fbResData?.error;
            let errMsg = metaErr?.message || 'Meta Graph API rejected post.';
            if (metaErr?.code === 190) {
              errMsg = 'Facebook Access Token expired. Please reconnect your Facebook Page in Connected Accounts.';
            } else if (metaErr?.code === 200) {
              errMsg = `Meta Permission Error: ${metaErr.message}. Ensure your Page token has 'pages_manage_posts' permission.`;
            }

            results.push({
              pageId: target.id,
              pageName: target.name,
              platform: 'facebook',
              status: 'failed',
              error: errMsg,
              timestamp,
            });
            continue;
          }

          const postId = fbResData.post_id || fbResData.id;
          const postUrl = `https://facebook.com/${postId}`;

          // First comment auto-post with cluster propagation & ID candidate fallback
          // For Facebook Page posts, comments work best on:
          // 1. `fbResData.post_id` (e.g. `pageId_storyId` or feed story ID)
          // 2. `${pageId}_${fbResData.id}` if id doesn't have pageId prefix
          // 3. `fbResData.id` (photo or video object node)
          // 4. If post_id has an underscore, also try the right part (isolated story ID)
          const rawCandidates: (string | undefined)[] = [
            fbResData.post_id,
            pageId && fbResData.id && !String(fbResData.id).includes('_') ? `${pageId}_${fbResData.id}` : undefined,
            fbResData.id,
            fbResData.post_id && String(fbResData.post_id).includes('_') ? String(fbResData.post_id).split('_')[1] : undefined,
          ];
          const commentTargetIds = Array.from(new Set(rawCandidates.filter(Boolean) as string[]));

          let commentRes: { success: boolean; commentId?: string; error?: string } | undefined;
          if (commentText && commentTargetIds.length > 0) {
            commentRes = await postFacebookCommentSafely(
              commentTargetIds,
              commentText,
              accessToken,
              target.name
            );
          }

          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'facebook',
            status: 'success',
            externalPostId: String(postId),
            postUrl,
            commentId: commentRes?.commentId,
            commentStatus: commentRes ? (commentRes.success ? 'success' : 'failed') : undefined,
            commentError: commentRes?.error,
            timestamp,
          });
        } catch (err: unknown) {
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'facebook',
            status: 'failed',
            error: err instanceof Error ? err.message : 'Network error contacting Meta API',
            timestamp,
          });
        }
        continue;
      }

      // 3. WORDPRESS DISPATCH (Auto Engine Bridge API & Standard REST API)
      if (target.platform === 'wordpress') {
        const siteUrl = (target.siteUrl || target.targetUrl || '').trim().replace(/\/+$/, '');
        const bridgeKey = target.bridgeApiKey || target.accessToken;
        const isAutoEngine = target.bridgeType === 'auto-engine' || !!bridgeKey;

        if (!siteUrl) {
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'wordpress',
            status: 'failed',
            error: 'Missing WordPress Site URL.',
            timestamp,
          });
          continue;
        }

        const wpPostTitle = title || message?.split('\n')[0] || 'Social Post Update';
        const wpPostContent = contentHtml || (message ? message.replace(/\n/g, '<br/>') : '');

        try {
          // Option A: Social Auto Poster Connector Plugin / Bridge API
          if (bridgeKey) {
            const publishPayload = {
              title: wpPostTitle,
              content: wpPostContent,
              featured_image: mediaUrl || '',
              featured_image_url: mediaUrl || '',
              status: 'publish',
              category: target.category || undefined,
              categories: target.category ? [target.category] : [],
            };

            // 1. Try Social Auto Poster Connector endpoint
            let wpRes = await fetch(`${siteUrl}/wp-json/social-poster/v1/publish`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-SAP-Secret': bridgeKey,
              },
              body: JSON.stringify(publishPayload),
            }).catch(() => null);

            // 2. If 404 or failed, fallback to legacy Auto Engine
            if (!wpRes || wpRes.status === 404) {
              wpRes = await fetch(`${siteUrl}/wp-json/auto-engine/v1/publish`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-AE-Key': bridgeKey,
                },
                body: JSON.stringify(publishPayload),
              }).catch(() => null);
            }

            const resData = wpRes ? await wpRes.json().catch(() => null) : null;

            if (!wpRes || !wpRes.ok || (!resData?.success && !resData?.post_id)) {
              const errMsg = resData?.message || resData?.error || `WordPress responded with HTTP ${wpRes?.status || 500}`;
              results.push({
                pageId: target.id,
                pageName: target.name,
                platform: 'wordpress',
                status: 'failed',
                error: errMsg,
                timestamp,
              });
              continue;
            }

            const wpPostId = resData.post_id || resData.id;
            results.push({
              pageId: target.id,
              pageName: target.name,
              platform: 'wordpress',
              status: 'success',
              externalPostId: String(wpPostId),
              postUrl: resData.permalink || resData.url || `${siteUrl}/?p=${wpPostId}`,
              timestamp,
            });
            continue;
          }

          // Option B: Standard WP REST API (Application Passwords)
          if (target.wpUsername && target.wpAppPassword) {
            const authHeader = 'Basic ' + Buffer.from(`${target.wpUsername}:${target.wpAppPassword}`).toString('base64');
            const wpRes = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
              },
              body: JSON.stringify({
                title: wpPostTitle,
                content: wpPostContent,
                status: 'publish',
              }),
            });

            const resData = await wpRes.json().catch(() => null);
            if (!wpRes.ok || !resData?.id) {
              results.push({
                pageId: target.id,
                pageName: target.name,
                platform: 'wordpress',
                status: 'failed',
                error: resData?.message || `WordPress REST API error HTTP ${wpRes.status}`,
                timestamp,
              });
              continue;
            }

            results.push({
              pageId: target.id,
              pageName: target.name,
              platform: 'wordpress',
              status: 'success',
              externalPostId: String(resData.id),
              postUrl: resData.link || `${siteUrl}/?p=${resData.id}`,
              timestamp,
            });
            continue;
          }

          // Fallback for mock/simulation
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'wordpress',
            status: 'success',
            externalPostId: `wp_${Date.now()}`,
            postUrl: `${siteUrl || 'https://mywordpress.com'}/sample-post-${Date.now()}`,
            timestamp,
          });
          continue;
        } catch (err: unknown) {
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'wordpress',
            status: 'failed',
            error: err instanceof Error ? err.message : 'Network error contacting WordPress site',
            timestamp,
          });
          continue;
        }
      }

      // 4. YOUTUBE DISPATCH (Shorts & Video Upload)
      if (target.platform === 'youtube') {
        const token = target.accessToken;
        if (!token) {
          // If direct handle was used without OAuth access token
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'youtube',
            status: 'failed',
            error: 'No active OAuth access token found for YouTube channel. Please connect via "OAuth Login (Google Cloud)" in Accounts to enable automated publishing.',
            timestamp,
          });
          continue;
        }

        if (postType !== 'video' || !mediaUrl) {
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'youtube',
            status: 'failed',
            error: 'YouTube supports video and Shorts uploads only. Please attach a video file.',
            timestamp,
          });
          continue;
        }

        try {
          let videoBuffer: Buffer | null = null;
          let mimeType = 'video/mp4';

          if (mediaUrl.startsWith('data:')) {
            const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match && match[1] && match[2]) {
              mimeType = match[1];
              videoBuffer = Buffer.from(match[2], 'base64');
            }
          } else if (mediaUrl.startsWith('/uploads/')) {
            const localPath = path.join(process.cwd(), 'public', mediaUrl.replace(/^\//, ''));
            if (fs.existsSync(localPath)) {
              videoBuffer = fs.readFileSync(localPath);
            } else {
              const { getMediaFromDb } = await import('@/lib/db/mysql');
              const dbMedia = await getMediaFromDb(mediaUrl);
              if (dbMedia) {
                videoBuffer = dbMedia.data;
                mimeType = dbMedia.mimeType;
              }
            }
          } else if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
            const fetchRes = await fetch(mediaUrl);
            if (fetchRes.ok) {
              const arr = await fetchRes.arrayBuffer();
              videoBuffer = Buffer.from(arr);
              mimeType = fetchRes.headers.get('content-type') || 'video/mp4';
            }
          }

          if (!videoBuffer) {
            results.push({
              pageId: target.id,
              pageName: target.name,
              platform: 'youtube',
              status: 'failed',
              error: 'Failed to retrieve video file for YouTube upload.',
              timestamp,
            });
            continue;
          }

          const ytTitle = (title || message.split('\n')[0] || 'New Video').slice(0, 100);
          const ytDescription = `${message}\n\n${commentText || ''}`.trim().slice(0, 5000);

          const metadata = {
            snippet: {
              title: ytTitle,
              description: ytDescription,
              tags: ['Shorts', 'Video', 'News'],
              categoryId: '25',
            },
            status: {
              privacyStatus: 'public',
              selfDeclaredMadeForKids: false,
            },
          };

          const boundary = `yt_bound_${Date.now()}`;
          const delimiter = `\r\n--${boundary}\r\n`;
          const closeDelimiter = `\r\n--${boundary}--`;

          const bodyParts = [
            Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter + `Content-Type: ${mimeType}\r\n\r\n`),
            videoBuffer,
            Buffer.from(closeDelimiter),
          ];

          const multipartBuffer = Buffer.concat(bodyParts);

          const uploadRes = await fetch(
            'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
                'Content-Length': String(multipartBuffer.length),
              },
              body: multipartBuffer,
            }
          );

          const uploadData = await uploadRes.json();

          if (uploadData.error) {
            results.push({
              pageId: target.id,
              pageName: target.name,
              platform: 'youtube',
              status: 'failed',
              error: uploadData.error.message || 'YouTube Data API upload error',
              timestamp,
            });
            continue;
          }

          const videoId = uploadData.id;
          const postUrl = `https://youtube.com/shorts/${videoId}`;

          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'youtube',
            status: 'success',
            externalPostId: videoId,
            postUrl,
            timestamp,
          });
          continue;
        } catch (ytErr: unknown) {
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'youtube',
            status: 'failed',
            error: ytErr instanceof Error ? ytErr.message : 'Network error uploading to YouTube',
            timestamp,
          });
          continue;
        }
      }

      // 5. INSTAGRAM DISPATCH (Meta Graph API)
      if (target.platform === 'instagram') {
        const accessToken = target.accessToken;
        const igUserId = target.pageId;

        if (!accessToken || !igUserId) {
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'instagram',
            status: 'failed',
            error: 'Missing Instagram Business User ID or Page Access Token.',
            timestamp,
          });
          continue;
        }

        try {
          const publicBaseUrl = 'https://game.khabarmonkey.com';

          // Helper to ensure media URL is a public HTTP/HTTPS URL that Meta servers can fetch
          const ensurePublicMediaUrl = async (rawUrl: string, isVideo: boolean): Promise<string> => {
            if (!rawUrl) return '';

            // 1. If it's already an absolute public HTTP/HTTPS URL
            if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
              // If it points to localhost or 127.0.0.1, replace host with publicBaseUrl
              if (rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')) {
                const parsed = new URL(rawUrl);
                return `${publicBaseUrl}${parsed.pathname}${parsed.search}`;
              }
              return rawUrl;
            }

            // 2. If it's a relative path e.g. /uploads/video.mp4
            if (rawUrl.startsWith('/')) {
              return `${publicBaseUrl}${rawUrl}`;
            }

            // 3. If it's a base64 data URI
            if (rawUrl.startsWith('data:')) {
              const match = rawUrl.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                const mimeType = match[1];
                const buffer = Buffer.from(match[2], 'base64');
                let ext = isVideo ? '.mp4' : '.jpg';
                if (mimeType.includes('png')) ext = '.png';
                else if (mimeType.includes('webp')) ext = '.webp';
                else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
                else if (mimeType.includes('mp4')) ext = '.mp4';

                const filename = `ig_${isVideo ? 'reel' : 'img'}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
                const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
                if (!fs.existsSync(uploadsDir)) {
                  fs.mkdirSync(uploadsDir, { recursive: true });
                }
                fs.writeFileSync(path.join(uploadsDir, filename), buffer);
                try {
                  const { saveMediaToDb } = await import('@/lib/db/mysql');
                  saveMediaToDb(filename, mimeType, buffer).catch(() => {});
                } catch {}

                return `${publicBaseUrl}/uploads/${filename}`;
              }
            }

            return `${publicBaseUrl}/${rawUrl}`;
          };

          const isVideoMedia =
            postType === 'video' ||
            (typeof mediaUrl === 'string' &&
              (/\.(mp4|mov|webm|avi|m4v)(\?.*)?$/i.test(mediaUrl) || mediaUrl.includes('video')));

          const captionText = [message || title || '', linkUrl ? `\n\n${linkUrl}` : '']
            .filter(Boolean)
            .join('')
            .trim();

          // A. Video / Reel Publishing
          if (isVideoMedia) {
            if (!mediaUrl) {
              results.push({
                pageId: target.id,
                pageName: target.name,
                platform: 'instagram',
                status: 'failed',
                error: 'Instagram Reel requires a video file or public video URL.',
                timestamp,
              });
              continue;
            }

            const publicVideoUrl = await ensurePublicMediaUrl(mediaUrl, true);

            // Step 1: Create Reel Container
            const createRes = await fetch(
              `https://graph.facebook.com/v19.0/${encodeURIComponent(igUserId)}/media`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  media_type: 'REELS',
                  video_url: publicVideoUrl,
                  caption: captionText,
                  access_token: accessToken,
                }),
              }
            );
            const createData = await createRes.json();

            if (createData.error || !createData.id) {
              const errMsg = createData.error?.message || 'Failed creating Instagram Reel container';
              results.push({
                pageId: target.id,
                pageName: target.name,
                platform: 'instagram',
                status: 'failed',
                error: errMsg,
                timestamp,
              });
              continue;
            }

            const creationId = createData.id;

            // Step 2: Poll container status until FINISHED
            let isReady = false;
            let attempts = 0;
            const maxAttempts = 25; // ~50s

            while (!isReady && attempts < maxAttempts) {
              attempts++;
              await new Promise((res) => setTimeout(res, 2000));

              try {
                const statusRes = await fetch(
                  `https://graph.facebook.com/v19.0/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(
                    accessToken
                  )}`
                );
                const statusData = await statusRes.json();

                if (statusData.status_code === 'FINISHED') {
                  isReady = true;
                  break;
                } else if (statusData.status_code === 'ERROR') {
                  throw new Error(
                    `Instagram processing error: ${statusData.status || 'Encoding failed'}`
                  );
                } else if (statusData.status_code === 'EXPIRED') {
                  throw new Error('Instagram container expired.');
                }
              } catch (pollErr: any) {
                if (pollErr.message?.includes('Instagram processing error')) throw pollErr;
              }
            }

            // Step 3: Publish container
            const pubRes = await fetch(
              `https://graph.facebook.com/v19.0/${encodeURIComponent(igUserId)}/media_publish`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  creation_id: creationId,
                  access_token: accessToken,
                }),
              }
            );
            const pubData = await pubRes.json();

            if (pubData.error || !pubData.id) {
              const errMsg = pubData.error?.message || 'Failed publishing Instagram Reel';
              results.push({
                pageId: target.id,
                pageName: target.name,
                platform: 'instagram',
                status: 'failed',
                error: errMsg,
                timestamp,
              });
              continue;
            }

            const mediaId = pubData.id;
            let postUrl = `https://www.instagram.com/reel/`;

            try {
              const permRes = await fetch(
                `https://graph.facebook.com/v19.0/${mediaId}?fields=permalink&access_token=${encodeURIComponent(
                  accessToken
                )}`
              );
              const permData = await permRes.json();
              if (permData.permalink) {
                postUrl = permData.permalink;
              }
            } catch {}

            // Step 4: First Comment
            if (commentText && commentText.trim()) {
              try {
                await fetch(
                  `https://graph.facebook.com/v19.0/${mediaId}/comments`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                      message: commentText.trim(),
                      access_token: accessToken,
                    }),
                  }
                );
              } catch {}
            }

            results.push({
              pageId: target.id,
              pageName: target.name,
              platform: 'instagram',
              status: 'success',
              externalPostId: mediaId,
              postUrl,
              timestamp,
            });
            continue;
          }

          // B. Photo / Image Publishing
          if (mediaUrl || postType === 'image') {
            const publicImageUrl = await ensurePublicMediaUrl(mediaUrl, false);

            if (!publicImageUrl) {
              results.push({
                pageId: target.id,
                pageName: target.name,
                platform: 'instagram',
                status: 'failed',
                error: 'Instagram requires an image or video to create a post.',
                timestamp,
              });
              continue;
            }

            // Step 1: Create Image Container
            const createRes = await fetch(
              `https://graph.facebook.com/v19.0/${encodeURIComponent(igUserId)}/media`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  image_url: publicImageUrl,
                  caption: captionText,
                  access_token: accessToken,
                }),
              }
            );
            const createData = await createRes.json();

            if (createData.error || !createData.id) {
              const errMsg = createData.error?.message || 'Failed creating Instagram image container';
              results.push({
                pageId: target.id,
                pageName: target.name,
                platform: 'instagram',
                status: 'failed',
                error: errMsg,
                timestamp,
              });
              continue;
            }

            const creationId = createData.id;

            // Brief wait for image container to be ready
            await new Promise((res) => setTimeout(res, 1200));

            // Step 2: Publish Image Container
            const pubRes = await fetch(
              `https://graph.facebook.com/v19.0/${encodeURIComponent(igUserId)}/media_publish`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  creation_id: creationId,
                  access_token: accessToken,
                }),
              }
            );
            const pubData = await pubRes.json();

            if (pubData.error || !pubData.id) {
              const errMsg = pubData.error?.message || 'Failed publishing Instagram photo';
              results.push({
                pageId: target.id,
                pageName: target.name,
                platform: 'instagram',
                status: 'failed',
                error: errMsg,
                timestamp,
              });
              continue;
            }

            const mediaId = pubData.id;
            let postUrl = `https://www.instagram.com/p/`;

            try {
              const permRes = await fetch(
                `https://graph.facebook.com/v19.0/${mediaId}?fields=permalink&access_token=${encodeURIComponent(
                  accessToken
                )}`
              );
              const permData = await permRes.json();
              if (permData.permalink) {
                postUrl = permData.permalink;
              }
            } catch {}

            // Step 3: First Comment
            if (commentText && commentText.trim()) {
              try {
                await fetch(
                  `https://graph.facebook.com/v19.0/${mediaId}/comments`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                      message: commentText.trim(),
                      access_token: accessToken,
                    }),
                  }
                );
              } catch {}
            }

            results.push({
              pageId: target.id,
              pageName: target.name,
              platform: 'instagram',
              status: 'success',
              externalPostId: mediaId,
              postUrl,
              timestamp,
            });
            continue;
          }

          // C. Text-only (Instagram Graph API requires media)
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'instagram',
            status: 'failed',
            error:
              'Instagram Graph API does not support text-only posts. Please attach an image or video/reel to publish to Instagram.',
            timestamp,
          });
          continue;
        } catch (igErr: unknown) {
          const errMsg = igErr instanceof Error ? igErr.message : 'Unknown Instagram publishing error';
          console.error('[Instagram Publisher Error]:', igErr);
          results.push({
            pageId: target.id,
            pageName: target.name,
            platform: 'instagram',
            status: 'failed',
            error: errMsg,
            timestamp,
          });
          continue;
        }
      }

      // 4. Fallback / Simulated for other channels
      results.push({
        pageId: target.id,
        pageName: target.name,
        platform: target.platform,
        status: 'success',
        externalPostId: `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        timestamp,
      });
    }

    return results;
}
