export type Platform = 'facebook' | 'instagram' | 'threads' | 'telegram' | 'youtube' | 'wordpress';

export type PostType = 'text' | 'image' | 'video' | 'link';

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'partial';

export type UserApprovalStatus = 'approved' | 'pending' | 'suspended' | 'rejected';
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'agency' | 'enterprise';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: 'active' | 'trial' | 'expired' | 'canceled';
  expiresAt: string | null; // ISO date string or null for lifetime
  maxConnectedPages: number;
  maxDailyPosts: number;
  features: {
    canUseAI: boolean;
    canUseBulkScheduler: boolean;
    canUseAutomationFeed: boolean;
    canUseAnalytics: boolean;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'owner' | 'admin' | 'editor' | 'member';
  provider?: 'google' | 'email' | 'demo';
  password?: string;
  approvalStatus?: UserApprovalStatus;
  rejectionReason?: string;
  subscription?: UserSubscription;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'agency';
  monthlyPostsLimit: number;
  monthlyPostsUsed: number;
  connectedChannelsLimit: number;
}

export interface MetaAppConfig {
  id: string;
  name: string;
  appId: string;
  appSecret: string;
  isDefault?: boolean;
  createdAt?: string;
  notes?: string;
}

export interface SocialAccount {
  id: string;
  platform: Platform;
  accountId: string;
  name: string;
  avatarUrl: string;
  status: 'active' | 'expired' | 'error';
  accessToken?: string;
  refreshToken?: string;
  botToken?: string;
  tokenExpiresAt?: string;
  lastCheckedAt: string;
  lastErrorMessage?: string;
  siteUrl?: string;
  wpUsername?: string;
  wpAppPassword?: string;
  bridgeApiKey?: string;
  bridgeType?: 'plugin-connector' | 'auto-engine' | 'rest-api';
  wpCategories?: WordPressCategory[];
  metaAppId?: string;
  metaAppName?: string;
}

export interface WordPressCategory {
  id: number | string;
  name: string;
  slug?: string;
  count?: number;
}

export type MonetizationProgramType =
  | 'content_monetization'
  | 'stars'
  | 'subscriptions'
  | 'in_stream_legacy'
  | 'ads_on_reels_legacy';

export type MonetizationStatus =
  | 'monetized_active'
  | 'not_monetized'
  | 'restricted'
  | 'insights_permission_missing';

export type PageIntegrityStatus = 'ok' | 'warning' | 'restricted' | 'suspended';

export interface PageMonetizationSummary {
  status: MonetizationStatus;
  activePrograms: MonetizationProgramType[];
  currency: string;
  todayEarningsMicro: number;
  last7dEarningsMicro: number;
  last30dEarningsMicro: number;
  breakdownByFormatMicro: {
    photosAndText: number;
    reels: number;
    videos: number;
    stories: number;
  };
  lastSyncedAt: string;
  detectedActiveAt?: string;
  lastError?: string;
}

export interface SocialPage {
  id: string;
  accountId: string;
  platform: Platform;
  pageId: string;
  name: string;
  avatarUrl: string;
  fanCount: number;
  followersCount?: number;
  followersDeltaToday?: number;
  lastFollowerSyncAt?: string;
  lastCheckedAt?: string;
  integrityStatus?: PageIntegrityStatus;
  integrityAlertReason?: string;
  monetization?: PageMonetizationSummary;
  category?: string;
  isActive: boolean;
  permissions?: string[];
  accessToken?: string;
  botToken?: string;
  chatId?: string;
  targetUrl?: string;
  linkedInstagramId?: string;
  linkedInstagramName?: string;
  siteUrl?: string;
  wpUsername?: string;
  wpAppPassword?: string;
  bridgeApiKey?: string;
  bridgeType?: 'plugin-connector' | 'auto-engine' | 'rest-api';
  wpCategories?: WordPressCategory[];
  metaAppId?: string;
  metaAppName?: string;
}

export interface PageCategory {
  id: string;
  name: string;
  color: string;
  pageIds: string[];
  tags: string[]; // default hashtags
}

export interface PostResult {
  pageId: string;
  platform: Platform;
  pageName: string;
  status: 'success' | 'failed' | 'draft' | 'scheduled';
  titleUsed?: string;
  subtitleUsed?: string;
  mediaUrl?: string;
  externalPostId?: string;
  postUrl?: string;
  commentId?: string;
  commentStatus?: 'success' | 'failed';
  commentError?: string;
  error?: string;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  postId: string;
  postMessage: string;
  postType: string;
  mediaUrl?: string;
  pageId: string;
  pageName: string;
  platform: Platform | string;
  status: 'success' | 'failed' | 'draft' | 'scheduled';
  externalPostId?: string;
  postUrl?: string;
  commentId?: string;
  commentStatus?: 'success' | 'failed';
  commentError?: string;
  error?: string;
  timestamp: string;
}

export interface Post {
  id: string;
  workspaceId: string;
  postType: PostType;
  title?: string;
  contentHtml?: string;
  message: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  featuredImageUrl?: string;
  isAiGenerated?: boolean;
  sigTemplateId?: string;
  linkUrl?: string;
  commentText?: string;
  wpCategories?: (string | number)[];
  pageIds: string[];
  status: PostStatus;
  externalPostId?: string;
  scheduledAt?: string;
  publishedAt?: string;
  intervalMinSeconds?: number;
  intervalMaxSeconds?: number;
  results: PostResult[];
  createdAt: string;
  updatedAt: string;
}

export type VideoMotionEffect =
  | 'none'
  | 'subtle_float' // Very gentle, slow breathing camera motion (ultra-smooth)
  | 'micro_jitter' // Extremely gentle micro handheld camera tremble (text stays 100% crisp)
  | 'smooth_sway' // Gentle slow horizontal cinematic sway
  | 'vertical_drift' // Very subtle vertical gentle bob
  | 'pulse_shake' // Gentle rhythmic heartbeat pulse with micro-vibration
  | 'shake' // Mild camera impact shake (toned down for legibility)
  | 'breaking_jitter' // Flash alert jitter (toned down for legibility)
  | 'zoom_in' // Smooth Ken Burns slow zoom in
  | 'zoom_out' // Smooth Ken Burns slow zoom out
  | 'pan_left'
  | 'pan_right'
  | 'pulse'
  | 'pulse_boom'
  | 'glitter';

export type VideoOverlayType =
  | 'none'
  | 'particle_snow' // Soft falling snowflakes
  | 'floating_dust' // Cinematic floating atmospheric dust motes & light specks
  | 'glitter_sparkle' // Sparkling diamond / golden stars shimmering
  | 'bokeh_lights' // Soft glowing floating bokeh orbs
  | 'fire_embers' // Gentle rising glowing embers / sparks
  | 'particles' // Ambient light particles (backward compatibility)
  | 'vignette' // Cinematic corner vignette
  | 'film_grain' // Vintage 35mm grain
  | 'breaking_banner' // Legacy
  | 'audio_wave' // Legacy
  | 'red_alert'; // Legacy

export interface SigTemplateVideoConfig {
  enabled?: boolean;
  durationSeconds?: number; // e.g. custom duration in seconds (5-90s)
  effect?: VideoMotionEffect; // single effect (legacy fallback)
  effects?: VideoMotionEffect[]; // Multiple simultaneous motion animation styles!
  effectDurationSeconds?: number; // Custom duration in seconds for animation effects to run
  motionIntensity?: number; // 5 to 100 (%) - default 20% (Subtle & Readable)
  overlays?: VideoOverlayType[]; // Multiple overlays can be selected!
  overlayIntensity?: number; // 10 to 100 (%) - default 50% (Balanced)
  musicUrl?: string; // audio file or URL
  musicName?: string;
  musicCategory?: 'breaking' | 'cricket' | 'devotional' | 'crime' | 'viral' | 'custom';
  musicVolume?: number; // 0 to 100 (default 100)
  targetPlatforms?: ('facebook' | 'instagram' | 'youtube')[];
}

export interface SigTemplate {
  id: string;
  name: string;
  templateType?: 'image' | 'reel';
  canvasWidth: number;
  canvasHeight: number;
  templateImageUrl: string;
  backgroundColor?: string; // Hex background color under transparent PNG areas (e.g. #0b0f19, #1e3a8a, or custom)
  layerMode?: 'overlay' | 'background'; // 'overlay' = photo behind transparent PNG frame (default); 'background' = template behind photo
  customFontUrl?: string;
  videoConfig?: SigTemplateVideoConfig;
  featuredImageBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    borderRadius?: number;
  };
  titleBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    lineHeight: number;
    textColor: string;
    highlightColor: string;
    fontFamily: string;
    alignment: 'left' | 'center' | 'right';
    verticalAlignment?: 'top' | 'center' | 'bottom';
  };
  isDefault?: boolean;
}

export interface AnalyticsMetric {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  views: number;
}

export interface ReactionBreakdown {
  like: number; // includes CARE natively in Meta Graph API
  love: number;
  wow: number;
  haha: number;
  sad: number;
  angry: number;
}

export interface PostCommentReply {
  id: string;
  authorName: string;
  authorAvatar?: string;
  isPageAuthor: boolean;
  message: string;
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  pageId: string;
  externalPostId: string;
  authorName: string;
  authorAvatar?: string;
  message: string;
  createdAt: string;
  likeCount: number;
  isLikedByPage?: boolean;
  isHidden?: boolean;
  privateReplySent?: boolean;
  replies: PostCommentReply[];
}

export interface PostPerformanceMetric {
  id: string;
  postId: string;
  pageId: string;
  pageName: string;
  externalPostId: string;
  postType: PostType;
  message: string;
  mediaUrl?: string;
  permalinkUrl?: string;
  publishedAt: string;
  reach: number; // post_total_media_view_unique
  mediaViews: number; // post_media_view
  likes: number;
  reactions: ReactionBreakdown;
  commentsCount: number;
  sharesCount: number;
  estimatedEarningsMicro: number; // content_monetization_earnings
  lastSyncedAt: string;
  isToday?: boolean;
}

export interface PageDailySeriesPoint {
  date: string;
  reach: number; // page_total_media_view_unique
  views: number; // page_media_view
  follows: number; // page_daily_follows
  unfollows: number; // page_daily_unfollows
  engagements: number; // page_post_engagements
}

export interface PageAnalyticsSnapshot {
  pageId: string;
  followersCount: number;
  followersDeltaToday: number;
  pageReach7d: number;
  pageMediaViews7d: number;
  pageViewsTotal7d: number; // page_views_total
  pagePostEngagements7d: number;
  pageVideoViews7d: number;
  topCountries: { country: string; code: string; count: number }[];
  dailySeries: PageDailySeriesPoint[];
  lastSyncedAt: string;
}

export type AutomationCaptionStyle = 'title_char_limit' | 'news_points' | 'full_title';
export type AutomationLinkPlacement = 'first_comment' | 'in_caption' | 'none';

export interface AutomationFeed {
  id: string;
  name: string;
  type: 'website_to_fb' | 'wordpress' | 'rss';
  feedUrl: string;
  siteUrl?: string; // Connected WordPress Site URL
  wpCategory?: string; // Specific WP Category (e.g. "Himachal News", "Health", "Dharm", or "*")
  targetCategoryId: string;
  targetPageIds?: string[]; // Specific targets (WordPress, Facebook, Telegram, etc.)
  targetReelPageIds?: string[]; // Targets for Reels (Facebook Reels, Instagram, YouTube)
  format?: 'ai_image' | 'featured_image' | 'link_card' | 'text_only' | 'ai_reel' | 'image_and_reel'; // Dispatch format
  generateVideoReel?: boolean; // Auto-generate 9:16 Video Reel from card image
  enableMultiTitle?: boolean; // Distribute 1 unique title per page
  isActive: boolean;
  intervalMinutes: number;
  lastCheckedAt?: string;
  itemsProcessed: number;
  autoGenerateImage: boolean;
  sigTemplateId?: string;
  linkInComment?: boolean; // Put link in 1st comment to boost Facebook reach
  customCaption?: string;
  captionStyle?: AutomationCaptionStyle;
  titleCharLimit?: number;
  seeMoreText?: string;
  linkPlacement?: AutomationLinkPlacement;
  commentTemplate?: string;
  pageIntervalMinSeconds?: number;
  pageIntervalMaxSeconds?: number;
  postStatus?: 'published' | 'draft' | 'drip_queue';
  publishingMode?: 'published' | 'draft' | 'drip_queue';
  dripIntervalMinMinutes?: number; // e.g. 27
  dripIntervalMaxMinutes?: number; // e.g. 33
  enableNightSleep?: boolean; // Pause queuing during night hours
  activeHoursStart?: string; // e.g. "07:00"
  activeHoursEnd?: string; // e.g. "23:00"
  processedGuids?: string[]; // Deduplication history
  lastDispatchedTitle?: string;
  maxItemsPerRun?: number;
}

export interface AppSettings {
  metaAppId: string;
  metaAppSecret: string;
  metaApps?: MetaAppConfig[];
  ytClientId: string;
  ytClientSecret: string;
  ytApiKey?: string;
  ytAutoShort?: boolean;
  ytDescriptionTemplate?: string;
  alertEmail?: string;
  autoRetryEnabled?: boolean;
  autoRetryMax?: number;
  autoRetryIntervalMin?: number;
  pageIntervalMinSeconds?: number;
  pageIntervalMaxSeconds?: number;
  automationPageIntervalMinSeconds?: number;
  automationPageIntervalMaxSeconds?: number;
  automationCaptionStyle?: AutomationCaptionStyle;
  automationTitleCharLimit?: number;
  automationSeeMoreText?: string;
  automationLinkPlacement?: AutomationLinkPlacement;
  automationCommentTemplate?: string;
  telegramBotToken: string;
  openaiApiKey: string;
  sensitiveWords: string[];
  cronSecretKey: string;
  webhookSecret: string;
}

// ── YouTube Channel to Social Auto-Repurposer ──
export type YouTubeContentFilter = 'all' | 'shorts_only' | 'videos_only';
export type YouTubePublishMode = 'auto_publish' | 'save_as_draft';

export interface YouTubeSyncRule {
  id: string;
  name: string;
  channelUrl: string;
  channelId: string;
  channelTitle: string;
  channelHandle?: string;
  channelAvatar?: string;
  isActive: boolean;
  filterType: YouTubeContentFilter;
  targetPageIds: string[];
  maxVideosPerCheck: number;
  captionTemplate?: string;
  includeDescription: boolean;
  customHashtags?: string;
  linkInComment?: boolean;
  publishMode: YouTubePublishMode;
  processedVideoIds: string[];
  lastTestVideoIndex?: number;
  lastCheckedAt?: string;
  lastProcessedAt?: string;
  totalSyncedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface YouTubeSyncLog {
  id: string;
  ruleId: string;
  ruleName: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds?: number;
  isShort: boolean;
  isTest?: boolean;
  status: 'downloading' | 'publishing' | 'published' | 'draft_saved' | 'failed';
  publishedTargets?: Array<{
    pageId: string;
    pageName: string;
    platform: string;
    status: 'success' | 'failed' | 'draft';
    postUrl?: string;
    error?: string;
  }>;
  downloadedFilePath?: string;
  fileSizeBytes?: number;
  error?: string;
  createdAt: string;
}
