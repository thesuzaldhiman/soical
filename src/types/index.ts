export type Platform = 'facebook' | 'instagram' | 'threads' | 'telegram' | 'youtube';

export type PostType = 'text' | 'image' | 'video' | 'link';

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'partial';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'owner' | 'admin' | 'editor';
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
  tokenExpiresAt?: string;
  lastCheckedAt: string;
  lastErrorMessage?: string;
}

export interface SocialPage {
  id: string;
  accountId: string;
  platform: Platform;
  pageId: string;
  name: string;
  avatarUrl: string;
  fanCount: number;
  category?: string;
  isActive: boolean;
  linkedInstagramId?: string;
  linkedInstagramName?: string;
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

export interface AutomationFeed {
  id: string;
  name: string;
  type: 'blogger' | 'rss' | 'wordpress';
  feedUrl: string;
  targetCategoryId: string;
  isActive: boolean;
  intervalMinutes: number;
  lastCheckedAt?: string;
  itemsProcessed: number;
  autoGenerateImage: boolean;
  sigTemplateId?: string;
}

export interface AppSettings {
  metaAppId: string;
  metaAppSecret: string;
  ytClientId: string;
  ytClientSecret: string;
  telegramBotToken: string;
  openaiApiKey: string;
  sensitiveWords: string[];
  cronSecretKey: string;
  webhookSecret: string;
}
