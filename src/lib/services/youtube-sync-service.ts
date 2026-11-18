import fs from 'fs';
import path from 'path';
import { getDbPool } from '@/lib/db/mysql';
import { YouTubeSyncRule, YouTubeSyncLog, SocialPage, Post } from '@/types';
import {
  fetchChannelLatestVideos,
  checkIfVideoIsShort,
  downloadYouTubeVideo,
} from './server-youtube-downloader';
import { dispatchToTargets, PublishTarget } from './publisher';

function parseJsonSafe<T>(val: unknown, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return val as T;
  try {
    return JSON.parse(String(val)) as T;
  } catch {
    return fallback;
  }
}

/**
 * Builds the caption text for Facebook/Instagram from video metadata and rule settings
 */
export function buildVideoCaption(
  title: string,
  description: string,
  rule: YouTubeSyncRule
): string {
  const parts: string[] = [];

  // Main Headline
  parts.push(title.trim());

  // Optional Description
  if (rule.includeDescription && description && description.trim()) {
    // Truncate description if excessively long (over 1000 chars)
    const cleanDesc = description.trim().slice(0, 800);
    parts.push('');
    parts.push(cleanDesc);
  }

  // Custom Hashtags
  if (rule.customHashtags && rule.customHashtags.trim()) {
    parts.push('');
    parts.push(rule.customHashtags.trim());
  }

  return parts.join('\n');
}

export interface SyncExecutionResult {
  ruleId: string;
  ruleName: string;
  processedCount: number;
  skippedCount: number;
  logs: YouTubeSyncLog[];
  error?: string;
}

/**
 * Processes a single YouTubeSyncRule: fetches new videos, downloads them, and publishes
 */
export async function processYouTubeSyncRule(
  rule: YouTubeSyncRule,
  userEmail: string
): Promise<SyncExecutionResult> {
  const pool = getDbPool();
  if (!pool) {
    throw new Error('Database pool not available');
  }

  const result: SyncExecutionResult = {
    ruleId: rule.id,
    ruleName: rule.name,
    processedCount: 0,
    skippedCount: 0,
    logs: [],
  };

  if (!rule.isActive) {
    result.error = 'Rule is currently paused/inactive.';
    return result;
  }

  if (!rule.targetPageIds || rule.targetPageIds.length === 0) {
    result.error = 'No destination Facebook/Instagram pages configured for this rule.';
    return result;
  }

  // 1. Fetch user's pages, posts, and rules from DB
  const [userRows] = await pool.query<any[]>(
    'SELECT pages, posts, youtube_rules, youtube_logs FROM app_user_data WHERE email = ? LIMIT 1',
    [userEmail]
  );

  if (!userRows || userRows.length === 0) {
    throw new Error(`User not found in database: ${userEmail}`);
  }

  const userPages: SocialPage[] = parseJsonSafe(userRows[0].pages, []);
  const userPosts: Post[] = parseJsonSafe(userRows[0].posts, []);
  const allUserRules: YouTubeSyncRule[] = parseJsonSafe(userRows[0].youtube_rules, []);
  const allUserLogs: YouTubeSyncLog[] = parseJsonSafe(userRows[0].youtube_logs, []);

  // Filter matching destination pages
  const destinationPages = userPages.filter((p) => rule.targetPageIds.includes(p.id));
  if (destinationPages.length === 0) {
    result.error = 'None of the selected destination pages were found in your connected accounts.';
    return result;
  }

  // 2. Fetch latest videos from channel XML feed
  const latestVideos = await fetchChannelLatestVideos(rule.channelId, 12);
  if (!latestVideos || latestVideos.length === 0) {
    console.log(`[YouTube Sync] No videos found in feed for ${rule.channelTitle} (${rule.channelId})`);
    return result;
  }

  // 3. Filter candidates that haven't been processed yet
  const processedSet = new Set(rule.processedVideoIds || []);
  const candidates = latestVideos.filter((v) => !processedSet.has(v.id));

  console.log(
    `[YouTube Sync] Rule "${rule.name}": Found ${latestVideos.length} feed videos, ${candidates.length} new candidates.`
  );

  const maxToProcess = Math.max(1, Math.min(rule.maxVideosPerCheck || 1, 3));
  let newlyProcessedCount = 0;

  for (const video of candidates) {
    if (newlyProcessedCount >= maxToProcess) break;

    // Check if Short
    const isShort = await checkIfVideoIsShort(video.id);
    video.isShort = isShort;

    // Respect filterType
    if (rule.filterType === 'shorts_only' && !isShort) {
      console.log(`[YouTube Sync] Skipping long video ${video.id} (Rule requires shorts_only)`);
      result.skippedCount++;
      // Mark processed so we don't re-check every minute
      processedSet.add(video.id);
      continue;
    }

    if (rule.filterType === 'videos_only' && isShort) {
      console.log(`[YouTube Sync] Skipping short ${video.id} (Rule requires videos_only)`);
      result.skippedCount++;
      processedSet.add(video.id);
      continue;
    }

    // Prepare Log Entry
    const logId = `ytlog_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const syncLog: YouTubeSyncLog = {
      id: logId,
      ruleId: rule.id,
      ruleName: rule.name,
      videoId: video.id,
      videoTitle: video.title,
      videoUrl: video.watchUrl,
      thumbnailUrl: video.thumbnailUrl,
      isShort,
      status: 'downloading',
      createdAt: new Date().toISOString(),
    };

    try {
      // Step A: Download YouTube Video
      console.log(`[YouTube Sync] Downloading MP4 for "${video.title}" (${video.id})...`);
      const dlResult = await downloadYouTubeVideo(video.id, `yt_${rule.id}_${video.id}_${Date.now()}`);

      syncLog.downloadedFilePath = dlResult.localFilePath;
      syncLog.fileSizeBytes = dlResult.fileSizeBytes;

      // Step B: Build Caption & Comment
      const captionText = buildVideoCaption(video.title, video.description, rule);
      const firstComment = rule.linkInComment ? `Original Source: ${video.watchUrl}` : undefined;

      // Step C: Dispatch or Save Draft
      if (rule.publishMode === 'auto_publish') {
        syncLog.status = 'publishing';

        const publishTargets = destinationPages.map((dp) => ({
          id: dp.id,
          name: dp.name,
          platform: dp.platform,
          accessToken: dp.accessToken,
          pageId: dp.pageId || dp.id,
        }));

        console.log(
          `[YouTube Sync] Publishing "${video.title}" live to ${publishTargets.length} page(s)...`
        );

        const dispatchResults = await dispatchToTargets({
          postType: 'video',
          title: video.title,
          message: captionText,
          mediaUrl: dlResult.publicUrl,
          commentText: firstComment,
          targets: publishTargets as PublishTarget[],
        });

        syncLog.publishedTargets = (dispatchResults || []).map((dr: any) => ({
          pageId: dr.pageId,
          pageName: dr.pageName,
          platform: dr.platform,
          status: dr.status,
          postUrl: dr.postUrl,
          error: dr.error,
        }));

        const anySuccess = (dispatchResults || []).some((dr: any) => dr.status === 'success');
        syncLog.status = anySuccess ? 'published' : 'failed';

        // Also add a Post record to Post Library for history/analytics
        const newPostRecord: Post = {
          id: `post_yt_${video.id}_${Date.now()}`,
          workspaceId: 'ws_default',
          postType: 'video',
          title: video.title,
          message: captionText,
          mediaUrl: dlResult.publicUrl,
          pageIds: destinationPages.map((dp) => dp.id),
          status: anySuccess ? 'published' : 'failed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: anySuccess ? new Date().toISOString() : undefined,
          results: (dispatchResults || []).map((dr: any) => ({
            pageId: dr.pageId,
            pageName: dr.pageName,
            platform: dr.platform,
            status: dr.status,
            postUrl: dr.postUrl,
            error: dr.error,
            timestamp: new Date().toISOString(),
          })),
        };
        userPosts.unshift(newPostRecord);
      } else {
        // 'save_as_draft' mode: Create a draft post in Post Library for manual review & approval
        console.log(`[YouTube Sync] Saving "${video.title}" as draft in Post Library...`);

        const newDraftPost: Post = {
          id: `draft_yt_${video.id}_${Date.now()}`,
          workspaceId: 'ws_default',
          postType: 'video',
          title: `[YouTube] ${video.title}`,
          message: captionText,
          mediaUrl: dlResult.publicUrl,
          pageIds: destinationPages.map((dp) => dp.id),
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          results: destinationPages.map((dp) => ({
            pageId: dp.id,
            platform: dp.platform as any,
            pageName: dp.name,
            status: 'draft',
            timestamp: new Date().toISOString(),
          })),
        };

        userPosts.unshift(newDraftPost);
        syncLog.status = 'draft_saved';
      }

      processedSet.add(video.id);
      newlyProcessedCount++;
      result.processedCount++;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[YouTube Sync] Error processing video ${video.id}:`, errMsg);
      syncLog.status = 'failed';
      syncLog.error = errMsg;
    }

    result.logs.push(syncLog);
    allUserLogs.unshift(syncLog);
  }

  // 4. Update Rule and User Data in DB
  const updatedProcessedIds = Array.from(processedSet).slice(-200); // keep last 200 for memory efficiency
  const nowStr = new Date().toISOString();

  const updatedRule: YouTubeSyncRule = {
    ...rule,
    processedVideoIds: updatedProcessedIds,
    lastCheckedAt: nowStr,
    lastProcessedAt: newlyProcessedCount > 0 ? nowStr : rule.lastProcessedAt,
    totalSyncedCount: (rule.totalSyncedCount || 0) + newlyProcessedCount,
    updatedAt: nowStr,
  };

  const updatedRulesList = allUserRules.map((r) => (r.id === rule.id ? updatedRule : r));
  if (!updatedRulesList.some((r) => r.id === rule.id)) {
    updatedRulesList.push(updatedRule);
  }

  // Keep last 100 sync logs
  const trimmedLogs = allUserLogs.slice(0, 100);
  // Keep last 500 posts
  const trimmedPosts = userPosts.slice(0, 500);

  await pool.query(
    'UPDATE app_user_data SET youtube_rules = ?, youtube_logs = ?, posts = ?, updated_at = NOW() WHERE email = ?',
    [
      JSON.stringify(updatedRulesList),
      JSON.stringify(trimmedLogs),
      JSON.stringify(trimmedPosts),
      userEmail,
    ]
  );

  return result;
}

/**
 * Runs all active YouTube sync rules for all users
 */
export async function runAllActiveYouTubeRules(): Promise<{ totalRules: number; totalProcessed: number }> {
  const pool = getDbPool();
  if (!pool) return { totalRules: 0, totalProcessed: 0 };

  const [rows] = await pool.query<any[]>(
    'SELECT email, youtube_rules FROM app_user_data WHERE youtube_rules IS NOT NULL'
  );

  let totalRules = 0;
  let totalProcessed = 0;

  for (const row of rows || []) {
    const rules: YouTubeSyncRule[] = parseJsonSafe(row.youtube_rules, []);
    for (const r of rules) {
      if (r.isActive) {
        totalRules++;
        try {
          const res = await processYouTubeSyncRule(r, row.email);
          totalProcessed += res.processedCount;
        } catch (err) {
          console.error(`[YouTube Cron] Rule ${r.id} error:`, err);
        }
      }
    }
  }

  return { totalRules, totalProcessed };
}
