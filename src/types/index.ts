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
  bridgeType?: 'auto-engine' | 'rest-api';
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
  bridgeType?: 'auto-engine' | 'rest-api';
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
  status: 'success' | 'failed';
  externalPostId?: string;
  commentId?: string;
  error?: string;
  timestamp: string;
}

export interface Post {
  id: string;
  workspaceId: string;
  postType: PostType;
  message: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  linkUrl?: string;
  commentText?: string;
  pageIds: string[];
  status: PostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  intervalMinSeconds?: number;
  intervalMaxSeconds?: number;
  results: PostResult[];
  createdAt: string;
  updatedAt: string;
}

export interface SigTemplate {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  templateImageUrl: string;
  layerMode?: 'overlay' | 'background'; // 'overlay' = photo behind transparent PNG frame (default); 'background' = template behind photo
  customFontUrl?: string;
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

export interface AutomationFeed {
  id: string;
  name: string;
  type: 'blogger' | 'rss' | 'wordpress';
  feedUrl: string;
  targetCategoryId: string;
  targetPageIds?: string[]; // Specific targets (WordPress, Facebook, Telegram, etc.)
  isActive: boolean;
  intervalMinutes: number;
  lastCheckedAt?: string;
  itemsProcessed: number;
  autoGenerateImage: boolean;
  sigTemplateId?: string;
  linkInComment?: boolean; // Put link in 1st comment to boost Facebook reach
  customCaption?: string;
  postStatus?: 'published' | 'draft';
  processedGuids?: string[]; // Deduplication history
  lastDispatchedTitle?: string;
  maxItemsPerRun?: number;
}

export interface AppSettings {
  metaAppId: string;
  metaAppSecret: string;
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
  telegramBotToken: string;
  openaiApiKey: string;
  sensitiveWords: string[];
  cronSecretKey: string;
  webhookSecret: string;
}
