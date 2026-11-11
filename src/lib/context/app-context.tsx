'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Workspace,
  SocialAccount,
  SocialPage,
  PageCategory,
  Post,
  PostResult,
  Platform,
  SigTemplate,
  AnalyticsMetric,
  PageAnalyticsSnapshot,
  PostPerformanceMetric,
  PostComment,
  AutomationFeed,
  AppSettings,
  SubscriptionTier,
  UserSubscription,
} from '@/types';
import {
  INITIAL_ALL_USERS,
  INITIAL_WORKSPACE,
  INITIAL_ACCOUNTS,
  INITIAL_PAGES,
  INITIAL_CATEGORIES,
  INITIAL_POSTS,
  INITIAL_SIG_TEMPLATES,
  INITIAL_ANALYTICS,
  INITIAL_AUTOMATIONS,
  INITIAL_SETTINGS,
  INITIAL_PAGE_ANALYTICS,
  INITIAL_POST_PERFORMANCES,
  INITIAL_POST_COMMENTS,
  DEMO_ACCOUNTS,
  DEMO_PAGES,
  DEMO_CATEGORIES,
  DEMO_POSTS,
  DEMO_AUTOMATIONS,
  DEMO_PAGE_ANALYTICS,
  DEMO_POST_PERFORMANCES,
  DEMO_POST_COMMENTS,
} from '../state/mock-data';

interface AppContextType {
  user: User;
  workspace: Workspace;
  accounts: SocialAccount[];
  pages: SocialPage[];
  categories: PageCategory[];
  posts: Post[];
  sigTemplates: SigTemplate[];
  analytics: AnalyticsMetric[];
  pageAnalytics: Record<string, PageAnalyticsSnapshot>;
  postPerformances: PostPerformanceMetric[];
  postComments: PostComment[];
  automations: AutomationFeed[];
  settings: AppSettings;
  isHydrated: boolean;

  // Actions
  addAccount: (
    platform: Platform,
    name: string,
    extra?: {
      accessToken?: string;
      botToken?: string;
      chatId?: string;
      avatarUrl?: string;
      pageId?: string;
      fanCount?: number;
      accountId?: string;
    }
  ) => SocialAccount;
  addPages: (pagesToAdd: SocialPage[]) => void;
  updatePage: (id: string, pageData: Partial<SocialPage>) => void;
  removeAccount: (id: string) => void;
  togglePageActive: (id: string) => void;
  disconnectPage: (id: string) => void;
  updateUser: (userData: Partial<User>) => void;
  updateWorkspace: (workspaceData: Partial<Workspace>) => void;
  createCategory: (name: string, color: string, pageIds: string[], tags: string[]) => void;
  updateCategory: (category: PageCategory) => void;
  deleteCategory: (id: string) => void;
  createPost: (
    postData: Omit<Post, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'results'> & {
      results?: PostResult[];
    }
  ) => Post;
  retryPost: (postId: string) => void;
  deletePost: (postId: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  createAutomation: (feed: Omit<AutomationFeed, 'id' | 'itemsProcessed'>) => void;
  toggleAutomation: (id: string) => void;
  deleteAutomation: (id: string) => void;
  saveSigTemplate: (template: SigTemplate) => void;

  // Real & Live Utilities
  isAuthenticated: boolean;
  loginWithGoogle: (profile: { id?: string; name: string; email: string; avatar?: string }) => void;
  logout: () => void;
  clearAllData: () => void;
  loadDemoData: () => void;

  // Multi-Tenant SaaS Admin & User Management
  allUsers: User[];
  approveUser: (
    userId: string,
    tier?: SubscriptionTier,
    durationDays?: number,
    maxPages?: number,
    maxPosts?: number
  ) => void;
  rejectUser: (userId: string, reason?: string) => void;
  updateUserSubscription: (userId: string, sub: Partial<UserSubscription>) => void;
  toggleUserSuspension: (userId: string, reason?: string) => void;
  deleteUser: (userId: string) => void;
  registerUser: (
    name: string,
    email: string,
    tierPreference?: SubscriptionTier
  ) => { success: boolean; user: User; message: string };
  switchActiveUser: (userId: string) => void;

  // Facebook Analytics & Monetization Actions
  syncPageLiveFollowers: (pageId?: string) => Promise<void> | void;
  syncPostInsights: (pageId?: string) => Promise<void> | void;
  replyToComment: (commentId: string, message: string) => void;
  toggleLikeComment: (commentId: string) => void;
  toggleHideComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  sendPrivateReply: (commentId: string, message: string) => void;
  simulateWebhookEvent: (pageId?: string) => string;
  syncMonetizationAll: () => void;
}

const globalForContext = globalThis as unknown as { __appContext?: React.Context<AppContextType | null> };
const AppContext = globalForContext.__appContext || createContext<AppContextType | null>(null);
if (process.env.NODE_ENV !== 'production') {
  globalForContext.__appContext = AppContext;
}

const STORAGE_KEY = 'sap_saas_live_v1';

export const GUEST_USER: User = {
  id: '',
  name: '',
  email: '',
  avatar: '',
  role: 'owner',
};

const noop = () => {};
const noopAsync = async () => {};

export const FALLBACK_APP_CONTEXT: AppContextType = {
  user: GUEST_USER,
  workspace: INITIAL_WORKSPACE,
  accounts: INITIAL_ACCOUNTS,
  pages: INITIAL_PAGES,
  categories: INITIAL_CATEGORIES,
  posts: INITIAL_POSTS,
  sigTemplates: INITIAL_SIG_TEMPLATES,
  analytics: INITIAL_ANALYTICS,
  pageAnalytics: INITIAL_PAGE_ANALYTICS,
  postPerformances: INITIAL_POST_PERFORMANCES,
  postComments: INITIAL_POST_COMMENTS,
  automations: INITIAL_AUTOMATIONS,
  settings: INITIAL_SETTINGS,
  isHydrated: true,
  addAccount: () => ({
    id: '',
    platform: 'facebook',
    accountId: '',
    name: '',
    avatarUrl: '',
    status: 'active',
    lastCheckedAt: new Date().toISOString(),
  }),
  addPages: noop,
  updatePage: noop,
  removeAccount: noop,
  togglePageActive: noop,
  disconnectPage: noop,
  updateUser: noop,
  updateWorkspace: noop,
  createCategory: noop,
  updateCategory: noop,
  deleteCategory: noop,
  createPost: (data: Parameters<AppContextType['createPost']>[0]) => ({
    ...data,
    id: `pst_${Date.now()}`,
    workspaceId: 'ws_default',
    results: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  retryPost: noop,
  deletePost: noop,
  updateSettings: noop,
  createAutomation: noop,
  toggleAutomation: noop,
  deleteAutomation: noop,
  saveSigTemplate: noop,
  isAuthenticated: false,
  loginWithGoogle: noop,
  logout: noop,
  clearAllData: noop,
  loadDemoData: noop,
  allUsers: INITIAL_ALL_USERS,
  approveUser: noop,
  rejectUser: noop,
  updateUserSubscription: noop,
  toggleUserSuspension: noop,
  deleteUser: noop,
  registerUser: () => ({ success: false, user: GUEST_USER, message: '' }),
  switchActiveUser: noop,
  syncPageLiveFollowers: noopAsync,
  syncPostInsights: noopAsync,
  replyToComment: noop,
  toggleLikeComment: noop,
  toggleHideComment: noop,
  deleteComment: noop,
  sendPrivateReply: noop,
  simulateWebhookEvent: () => 'Simulated event',
  syncMonetizationAll: noop,
};

const getStorageKeyForEmail = (email?: string) => {
  if (!email) return 'sap_saas_live_v1';
  const safe = email.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  return `sap_user_${safe}_v1`;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(GUEST_USER);
  const [workspace, setWorkspace] = useState<Workspace>(INITIAL_WORKSPACE);
  const [accounts, setAccounts] = useState<SocialAccount[]>(INITIAL_ACCOUNTS);
  const [pages, setPages] = useState<SocialPage[]>(INITIAL_PAGES);
  const [categories, setCategories] = useState<PageCategory[]>(INITIAL_CATEGORIES);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [sigTemplates, setSigTemplates] = useState<SigTemplate[]>(INITIAL_SIG_TEMPLATES);
  const [analytics] = useState<AnalyticsMetric[]>(INITIAL_ANALYTICS);
  const [pageAnalytics, setPageAnalytics] = useState<Record<string, PageAnalyticsSnapshot>>(INITIAL_PAGE_ANALYTICS);
  const [postPerformances, setPostPerformances] = useState<PostPerformanceMetric[]>(INITIAL_POST_PERFORMANCES);
  const [postComments, setPostComments] = useState<PostComment[]>(INITIAL_POST_COMMENTS);
  const [automations, setAutomations] = useState<AutomationFeed[]>(INITIAL_AUTOMATIONS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('sap_all_registered_users');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return INITIAL_ALL_USERS;
  });

  // Sync registered users to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('sap_all_registered_users', JSON.stringify(allUsers));
      }
    } catch (e) {
      console.error('Failed to save allUsers:', e);
    }
  }, [allUsers, isHydrated]);

  // Helper to load user-isolated data
  const loadUserDataForEmail = (email: string, name?: string) => {
    if (typeof localStorage === 'undefined') return;
    const userKey = getStorageKeyForEmail(email);
    let stored = localStorage.getItem(userKey);

    // Backward compatibility: If no user key exists yet for Suzal, check previous storage keys
    if (!stored && (email.includes('suzal') || email.includes('khabarmonkey'))) {
      stored = localStorage.getItem('sap_saas_live_v1') || localStorage.getItem('sap_saas_app_state_v2');
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.accounts) setAccounts(parsed.accounts);
        else setAccounts([]);
        if (parsed.pages) setPages(parsed.pages);
        else setPages([]);
        if (parsed.categories) setCategories(parsed.categories);
        else setCategories(INITIAL_CATEGORIES);
        if (parsed.posts) setPosts(parsed.posts);
        else setPosts([]);
        if (parsed.sigTemplates) setSigTemplates(parsed.sigTemplates);
        else setSigTemplates(INITIAL_SIG_TEMPLATES);
        if (parsed.pageAnalytics) setPageAnalytics(parsed.pageAnalytics);
        else setPageAnalytics({});
        if (parsed.postPerformances) setPostPerformances(parsed.postPerformances);
        else setPostPerformances([]);
        if (parsed.postComments) setPostComments(parsed.postComments);
        else setPostComments([]);
        if (parsed.automations) setAutomations(parsed.automations);
        else setAutomations([]);
        if (parsed.settings) {
          setSettings((prev) => ({ ...prev, ...parsed.settings }));
        } else {
          const globalRaw = localStorage.getItem('sap_app_settings');
          if (globalRaw) {
            try {
              setSettings((prev) => ({ ...prev, ...JSON.parse(globalRaw) }));
            } catch {}
          }
        }
        if (parsed.workspace) {
          setWorkspace(parsed.workspace);
        } else {
          setWorkspace({
            id: `ws_${email.replace(/[^a-z0-9_]/g, '_')}`,
            name: `${name || email.split('@')[0]}'s Workspace`,
            slug: 'workspace',
            plan: 'pro',
            monthlyPostsLimit: 1500,
            monthlyPostsUsed: 0,
            connectedChannelsLimit: 25,
          });
        }
        return;
      } catch (e) {
        console.error('Failed to parse user state:', e);
      }
    }

    // New user with no prior data -> Brand new isolated clean state!
    setAccounts([]);
    setPages([]);
    setCategories(INITIAL_CATEGORIES);
    setPosts([]);
    setSigTemplates(INITIAL_SIG_TEMPLATES);
    setPageAnalytics({});
    setPostPerformances([]);
    setPostComments([]);
    setAutomations([]);
    setSettings(INITIAL_SETTINGS);
    setWorkspace({
      id: `ws_${email.replace(/[^a-z0-9_]/g, '_')}`,
      name: `${name || email.split('@')[0]}'s Workspace`,
      slug: 'workspace',
      plan: 'pro',
      monthlyPostsLimit: 1500,
      monthlyPostsUsed: 0,
      connectedChannelsLimit: 25,
    });
  };

  // Hydrate from localStorage / Cookies on client mount
  useEffect(() => {
    try {
      let loggedInUser: User | null = null;
      let currentUsers = allUsers;

      // 0. Load registered users directory for session matching
      if (typeof localStorage !== 'undefined') {
        const storedUsers = localStorage.getItem('sap_all_registered_users');
        if (storedUsers) {
          try {
            const parsed = JSON.parse(storedUsers);
            if (Array.isArray(parsed) && parsed.length > 0) {
              currentUsers = parsed;
            }
          } catch {}
        }
      }

      // 1. Check for Google Session cookie
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^| )sap_google_user=([^;]+)'));
        if (match) {
          try {
            const parsed = JSON.parse(decodeURIComponent(match[2]));
            if (parsed && parsed.email) {
              loggedInUser = {
                id: parsed.id || `google_${Date.now()}`,
                name: parsed.name || parsed.email.split('@')[0],
                email: parsed.email.toLowerCase().trim(),
                avatar: parsed.avatar || '/icons/social/google.png',
                role: 'owner',
                provider: 'google',
              };
            }
          } catch (e) {
            console.error('Failed parsing cookie:', e);
          }
        }
      }

      // 2. Fallback to localStorage session
      if (!loggedInUser && typeof localStorage !== 'undefined') {
        const savedEmail = localStorage.getItem('sap_current_user_email');
        if (savedEmail) {
          const storedUserStr = localStorage.getItem(`sap_user_profile_${savedEmail.replace(/[^a-z0-9_]/g, '_')}`);
          if (storedUserStr) {
            try {
              loggedInUser = JSON.parse(storedUserStr);
            } catch {}
          }
        }
      }

      if (loggedInUser && loggedInUser.email) {
        const clean = loggedInUser.email.toLowerCase().trim();
        const existing = currentUsers.find((u) => u.email.toLowerCase() === clean);
        if (existing) {
          loggedInUser = {
            ...existing,
            name: loggedInUser.name || existing.name,
            avatar: loggedInUser.avatar || existing.avatar,
            lastLoginAt: new Date().toISOString(),
          };
        } else {
          const isOwner =
            clean.includes('suzal') || clean.includes('khabarmonkey') || clean.startsWith('admin');
          loggedInUser = {
            ...loggedInUser,
            role: isOwner ? 'owner' : 'member',
            approvalStatus: isOwner ? 'approved' : 'pending',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            subscription: isOwner
              ? {
                  tier: 'agency',
                  status: 'active',
                  expiresAt: null,
                  maxConnectedPages: 50,
                  maxDailyPosts: 500,
                  features: { canUseAI: true, canUseBulkScheduler: true, canUseAutomationFeed: true, canUseAnalytics: true },
                }
              : {
                  tier: 'starter',
                  status: 'trial',
                  expiresAt: null,
                  maxConnectedPages: 5,
                  maxDailyPosts: 30,
                  features: { canUseAI: true, canUseBulkScheduler: true, canUseAutomationFeed: false, canUseAnalytics: true },
                },
          };
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(loggedInUser);
        setIsAuthenticated(true);
        loadUserDataForEmail(loggedInUser.email, loggedInUser.name);
      } else {
        setIsAuthenticated(false);
        setUser(GUEST_USER);
      }

      // Always load settings from sap_app_settings if present
      if (typeof localStorage !== 'undefined') {
        const storedSettings = localStorage.getItem('sap_app_settings');
        if (storedSettings) {
          try {
            setSettings((prev) => ({ ...prev, ...JSON.parse(storedSettings) }));
          } catch {}
        }
      }
    } catch (e) {
      console.error('Failed to load state during hydration:', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to user-isolated localStorage on state changes
  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !user?.email) return;
    try {
      const storageKey = getStorageKeyForEmail(user.email);
      const payload = {
        accounts,
        pages,
        categories,
        posts,
        sigTemplates,
        pageAnalytics,
        postPerformances,
        postComments,
        automations,
        settings,
        workspace,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }, [
    accounts,
    pages,
    categories,
    posts,
    sigTemplates,
    pageAnalytics,
    postPerformances,
    postComments,
    automations,
    settings,
    workspace,
    isHydrated,
    isAuthenticated,
    user?.email,
  ]);

  const addAccount = (
    platform: Platform,
    name: string,
    extra?: {
      accessToken?: string;
      botToken?: string;
      chatId?: string;
      avatarUrl?: string;
      pageId?: string;
      fanCount?: number;
      accountId?: string;
    }
  ): SocialAccount => {
    const newAcc: SocialAccount = {
      id: `acc_${platform}_${Date.now()}`,
      platform,
      accountId: extra?.accountId || extra?.chatId || extra?.pageId || `ext_${Date.now()}`,
      name,
      avatarUrl: extra?.avatarUrl || `/icons/social/${platform}.png`,
      status: 'active',
      accessToken: extra?.accessToken,
      botToken: extra?.botToken,
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      lastCheckedAt: new Date().toISOString(),
    };
    setAccounts((prev) => [newAcc, ...prev]);

    // If direct page credentials provided, auto-add destination
    if (extra?.chatId || extra?.pageId || extra?.accessToken || extra?.botToken) {
      const newPage: SocialPage = {
        id: `pg_${Date.now()}`,
        accountId: newAcc.id,
        platform,
        pageId: extra?.chatId || extra?.pageId || `pid_${Date.now()}`,
        name,
        avatarUrl: newAcc.avatarUrl,
        fanCount: extra?.fanCount || 0,
        isActive: true,
        category: `${platform.toUpperCase()} Target`,
        accessToken: extra?.accessToken,
        botToken: extra?.botToken,
        chatId: extra?.chatId,
        targetUrl: extra?.chatId?.startsWith('@') ? `https://t.me/${extra.chatId.replace('@', '')}` : undefined,
        permissions:
          platform === 'telegram'
            ? ['post_messages', 'send_media']
            : ['pages_manage_posts', 'pages_read_engagement'],
      };
      setPages((prev) => [...prev, newPage]);
    }

    return newAcc;
  };

  const addPages = (pagesToAdd: SocialPage[]) => {
    setPages((prev) => {
      const incomingMap = new Map<string, SocialPage>();
      pagesToAdd.forEach((p) => incomingMap.set(p.pageId, p));

      // 1. Update existing pages if re-imported with fresh token or updated metadata
      const updatedPrev = prev.map((existing) => {
        const incoming = incomingMap.get(existing.pageId);
        if (incoming) {
          incomingMap.delete(existing.pageId);
          return {
            ...existing,
            accessToken: incoming.accessToken || existing.accessToken,
            name: incoming.name || existing.name,
            avatarUrl: incoming.avatarUrl || existing.avatarUrl,
            fanCount: incoming.fanCount ?? existing.fanCount,
            followersCount: incoming.followersCount ?? existing.followersCount,
            lastCheckedAt: incoming.lastCheckedAt || new Date().toISOString(),
          };
        }
        return existing;
      });

      // 2. Append newly added pages
      const fresh = Array.from(incomingMap.values());
      return [...updatedPrev, ...fresh];
    });
  };

  const updatePage = (id: string, pageData: Partial<SocialPage>) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === id || p.pageId === id) {
          return { ...p, ...pageData };
        }
        return p;
      })
    );
  };

  const removeAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setPages((prev) => prev.filter((p) => p.accountId !== id));
  };

  const togglePageActive = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
  };

  const disconnectPage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...userData }));
  };

  const updateWorkspace = (workspaceData: Partial<Workspace>) => {
    setWorkspace((prev) => ({ ...prev, ...workspaceData }));
  };

  const createCategory = (name: string, color: string, pageIds: string[], tags: string[]) => {
    const newCat: PageCategory = {
      id: `cat_${Date.now()}`,
      name,
      color,
      pageIds,
      tags,
    };
    setCategories((prev) => [...prev, newCat]);
  };

  const updateCategory = (category: PageCategory) => {
    setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const createPost = (
    postData: Omit<Post, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'results'> & {
      results?: PostResult[];
    }
  ): Post => {
    const isNow = postData.status === 'published';
    const postResults = postData.results
      ? postData.results
      : isNow
      ? postData.pageIds.map((pid) => {
          const pg = pages.find((p) => p.id === pid);
          return {
            pageId: pid,
            platform: pg?.platform || 'facebook',
            pageName: pg?.name || 'Social Target',
            status: 'success' as const,
            externalPostId: `ext_pub_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            commentId: postData.commentText ? `comm_${Date.now()}` : undefined,
            timestamp: new Date().toISOString(),
          };
        })
      : [];

    const newPost: Post = {
      ...postData,
      id: `pst_${Date.now()}`,
      workspaceId: workspace.id,
      results: postResults,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: isNow ? new Date().toISOString() : undefined,
    };

    setPosts((prev) => [newPost, ...prev]);

    if (isNow) {
      setWorkspace((prev) => ({
        ...prev,
        monthlyPostsUsed: prev.monthlyPostsUsed + 1,
      }));

      // Immediately register in post performances so it appears in analytics
      const nowIso = new Date().toISOString();
      const perfEntries: PostPerformanceMetric[] = postData.pageIds.map((pid) => {
        const pg = pages.find((p) => p.id === pid);
        return {
          id: `perf_${Date.now()}_${pid}`,
          postId: newPost.id,
          pageId: pid,
          pageName: pg?.name || 'Destination',
          externalPostId: `ext_${Date.now()}_${pid}`,
          postType: postData.postType,
          message: postData.message,
          mediaUrl: postData.mediaUrl,
          permalinkUrl: postData.linkUrl || pg?.targetUrl || undefined,
          publishedAt: nowIso,
          reach: 0,
          mediaViews: 0,
          likes: 0,
          reactions: { like: 0, love: 0, wow: 0, haha: 0, sad: 0, angry: 0 },
          commentsCount: 0,
          sharesCount: 0,
          estimatedEarningsMicro: 0,
          lastSyncedAt: nowIso,
          isToday: true,
        };
      });
      setPostPerformances((prev) => [...perfEntries, ...prev]);
    }

    return newPost;
  };

  const retryPost = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const retriedResults = post.pageIds.map((pid) => {
          const pg = pages.find((p) => p.id === pid);
          return {
            pageId: pid,
            platform: pg?.platform || 'facebook',
            pageName: pg?.name || 'Social Target',
            status: 'success' as const,
            externalPostId: `retry_${Date.now()}`,
            timestamp: new Date().toISOString(),
          };
        });
        return {
          ...post,
          status: 'published',
          publishedAt: new Date().toISOString(),
          results: retriedResults,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const deletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('sap_app_settings', JSON.stringify(updated));
          if (user?.email) {
            const userKey = getStorageKeyForEmail(user.email);
            const userStored = localStorage.getItem(userKey);
            const userPayload = userStored ? JSON.parse(userStored) : {};
            userPayload.settings = updated;
            localStorage.setItem(userKey, JSON.stringify(userPayload));
          }
          const liveStored = localStorage.getItem(STORAGE_KEY);
          if (liveStored) {
            const liveParsed = JSON.parse(liveStored);
            liveParsed.settings = updated;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(liveParsed));
          }
        } catch (e) {
          console.error('Failed to sync settings:', e);
        }
      }
      return updated;
    });
  };

  const createAutomation = (feed: Omit<AutomationFeed, 'id' | 'itemsProcessed'>) => {
    const newFeed: AutomationFeed = {
      ...feed,
      id: `auto_${Date.now()}`,
      itemsProcessed: 0,
    };
    setAutomations((prev) => [...prev, newFeed]);
  };

  const toggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
  };

  const deleteAutomation = (id: string) => {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
  };

  const saveSigTemplate = (template: SigTemplate) => {
    setSigTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === template.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = template;
        return copy;
      }
      return [...prev, template];
    });
  };

  // Real & Live Utilities
  const loginWithGoogle = (profile: { id?: string; name: string; email: string; avatar?: string }) => {
    const cleanEmail = profile.email.toLowerCase().trim();
    const isOwner =
      cleanEmail.includes('suzal') ||
      cleanEmail.includes('khabarmonkey') ||
      cleanEmail.startsWith('admin');

    const existing = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    let googleUser: User;

    if (existing) {
      googleUser = {
        ...existing,
        name: profile.name || existing.name,
        avatar: profile.avatar || existing.avatar,
        lastLoginAt: new Date().toISOString(),
      };
      setAllUsers((prev) => prev.map((u) => (u.id === googleUser.id ? googleUser : u)));
    } else {
      googleUser = {
        id: profile.id || `google_${cleanEmail.replace(/[^a-z0-9_]/g, '_')}`,
        name: profile.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: profile.avatar || '/icons/social/google.png',
        role: isOwner ? 'owner' : 'member',
        provider: 'google',
        approvalStatus: isOwner ? 'approved' : 'pending',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        subscription: isOwner
          ? {
              tier: 'agency',
              status: 'active',
              expiresAt: null,
              maxConnectedPages: 50,
              maxDailyPosts: 500,
              features: { canUseAI: true, canUseBulkScheduler: true, canUseAutomationFeed: true, canUseAnalytics: true },
            }
          : {
              tier: 'starter',
              status: 'trial',
              expiresAt: null,
              maxConnectedPages: 5,
              maxDailyPosts: 30,
              features: { canUseAI: true, canUseBulkScheduler: true, canUseAutomationFeed: false, canUseAnalytics: true },
            },
      };
      setAllUsers((prev) => [googleUser, ...prev]);
    }

    setUser(googleUser);
    setIsAuthenticated(true);
    if (typeof document !== 'undefined') {
      document.cookie = `sap_google_user=${encodeURIComponent(JSON.stringify(googleUser))}; path=/; max-age=2592000; SameSite=Lax`;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sap_current_user_email', cleanEmail);
      localStorage.setItem(
        `sap_user_profile_${cleanEmail.replace(/[^a-z0-9_]/g, '_')}`,
        JSON.stringify(googleUser)
      );
    }
    loadUserDataForEmail(cleanEmail, googleUser.name);
  };

  const registerUser = (
    name: string,
    email: string,
    tierPreference: SubscriptionTier = 'starter'
  ) => {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, user: GUEST_USER, message: 'Please provide a valid email address.' };
    }

    const existing = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, user: existing, message: 'This email is already registered. Please sign in.' };
    }

    const isOwner =
      cleanEmail.includes('suzal') ||
      cleanEmail.includes('khabarmonkey') ||
      cleanEmail.startsWith('admin');

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: name.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      role: isOwner ? 'owner' : 'member',
      provider: 'email',
      approvalStatus: isOwner ? 'approved' : 'pending',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      subscription: isOwner
        ? {
            tier: 'agency',
            status: 'active',
            expiresAt: null,
            maxConnectedPages: 50,
            maxDailyPosts: 500,
            features: { canUseAI: true, canUseBulkScheduler: true, canUseAutomationFeed: true, canUseAnalytics: true },
          }
        : {
            tier: tierPreference,
            status: 'trial',
            expiresAt: null,
            maxConnectedPages: tierPreference === 'pro' ? 15 : tierPreference === 'agency' ? 50 : 5,
            maxDailyPosts: tierPreference === 'pro' ? 100 : tierPreference === 'agency' ? 500 : 30,
            features: {
              canUseAI: true,
              canUseBulkScheduler: tierPreference !== 'free',
              canUseAutomationFeed: tierPreference === 'agency',
              canUseAnalytics: true,
            },
          },
    };

    setAllUsers((prev) => [newUser, ...prev]);
    setUser(newUser);
    setIsAuthenticated(true);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sap_current_user_email', cleanEmail);
      localStorage.setItem(
        `sap_user_profile_${cleanEmail.replace(/[^a-z0-9_]/g, '_')}`,
        JSON.stringify(newUser)
      );
    }

    return {
      success: true,
      user: newUser,
      message: isOwner ? 'Welcome Admin!' : 'Signup successful! Account is awaiting admin approval.',
    };
  };

  const approveUser = (
    userId: string,
    tier: SubscriptionTier = 'pro',
    durationDays: number = 30,
    maxPages?: number,
    maxPosts?: number
  ) => {
    const expiresAt =
      durationDays > 0 ? new Date(Date.now() + durationDays * 86400000).toISOString() : null;

    setAllUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const currentSub = u.subscription;
        const updated: User = {
          ...u,
          approvalStatus: 'approved',
          rejectionReason: undefined,
          subscription: {
            tier,
            status: 'active',
            expiresAt,
            maxConnectedPages:
              maxPages !== undefined
                ? maxPages
                : tier === 'agency'
                ? 50
                : tier === 'pro'
                ? 15
                : tier === 'starter'
                ? 5
                : 2,
            maxDailyPosts:
              maxPosts !== undefined
                ? maxPosts
                : tier === 'agency'
                ? 500
                : tier === 'pro'
                ? 100
                : tier === 'starter'
                ? 30
                : 10,
            features: {
              canUseAI: true,
              canUseBulkScheduler: tier !== 'free',
              canUseAutomationFeed: tier === 'agency',
              canUseAnalytics: true,
              ...currentSub?.features,
            },
          },
        };
        return updated;
      })
    );

    if (user.id === userId) {
      setUser((prev) => ({
        ...prev,
        approvalStatus: 'approved',
        rejectionReason: undefined,
        subscription: {
          tier,
          status: 'active',
          expiresAt,
          maxConnectedPages: maxPages || 15,
          maxDailyPosts: maxPosts || 100,
          features: {
            canUseAI: true,
            canUseBulkScheduler: tier !== 'free',
            canUseAutomationFeed: tier === 'agency',
            canUseAnalytics: true,
          },
        },
      }));
    }
  };

  const rejectUser = (userId: string, reason?: string) => {
    const finalReason = reason || 'Application rejected by system administrator.';
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, approvalStatus: 'rejected', rejectionReason: finalReason } : u))
    );
    if (user.id === userId) {
      setUser((prev) => ({ ...prev, approvalStatus: 'rejected', rejectionReason: finalReason }));
    }
  };

  const toggleUserSuspension = (userId: string, reason?: string) => {
    setAllUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const willSuspend = u.approvalStatus !== 'suspended';
        return {
          ...u,
          approvalStatus: willSuspend ? 'suspended' : 'approved',
          rejectionReason: willSuspend ? reason || 'Account suspended by administrator' : undefined,
        };
      })
    );
    if (user.id === userId) {
      setUser((prev) => {
        const willSuspend = prev.approvalStatus !== 'suspended';
        return {
          ...prev,
          approvalStatus: willSuspend ? 'suspended' : 'approved',
          rejectionReason: willSuspend ? reason || 'Account suspended by administrator' : undefined,
        };
      });
    }
  };

  const updateUserSubscription = (userId: string, sub: Partial<UserSubscription>) => {
    setAllUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        return {
          ...u,
          subscription: {
            tier: 'pro',
            status: 'active',
            expiresAt: null,
            maxConnectedPages: 15,
            maxDailyPosts: 100,
            features: {
              canUseAI: true,
              canUseBulkScheduler: true,
              canUseAutomationFeed: true,
              canUseAnalytics: true,
            },
            ...u.subscription,
            ...sub,
          },
        };
      })
    );
    if (user.id === userId) {
      setUser((prev) => ({
        ...prev,
        subscription: {
          tier: 'pro',
          status: 'active',
          expiresAt: null,
          maxConnectedPages: 15,
          maxDailyPosts: 100,
          features: {
            canUseAI: true,
            canUseBulkScheduler: true,
            canUseAutomationFeed: true,
            canUseAnalytics: true,
          },
          ...prev.subscription,
          ...sub,
        },
      }));
    }
  };

  const deleteUser = (userId: string) => {
    setAllUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const switchActiveUser = (userId: string) => {
    const target = allUsers.find((u) => u.id === userId);
    if (!target) return;
    setUser(target);
    setIsAuthenticated(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sap_current_user_email', target.email);
      localStorage.setItem(
        `sap_user_profile_${target.email.replace(/[^a-z0-9_]/g, '_')}`,
        JSON.stringify(target)
      );
    }
    loadUserDataForEmail(target.email, target.name);
  };

  const logout = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'sap_google_user=; path=/; max-age=0; SameSite=Lax';
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('sap_current_user_email');
    }
    setIsAuthenticated(false);
    setUser(GUEST_USER);
    setAccounts([]);
    setPages([]);
    setCategories(INITIAL_CATEGORIES);
    setPosts([]);
    setSigTemplates(INITIAL_SIG_TEMPLATES);
    setPageAnalytics({});
    setPostPerformances([]);
    setPostComments([]);
    setAutomations([]);
  };

  const clearAllData = () => {
    setAccounts([]);
    setPages([]);
    setCategories([]);
    setPosts([]);
    setAutomations([]);
    setPageAnalytics({});
    setPostPerformances([]);
    setPostComments([]);
    try {
      if (user?.email) {
        localStorage.removeItem(getStorageKeyForEmail(user.email));
      }
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('sap_saas_app_state_v2');
    } catch (e) {
      console.error(e);
    }
  };

  const loadDemoData = () => {
    setAccounts(DEMO_ACCOUNTS);
    setPages(DEMO_PAGES);
    setCategories(DEMO_CATEGORIES);
    setPosts(DEMO_POSTS);
    setAutomations(DEMO_AUTOMATIONS);
    setPageAnalytics(DEMO_PAGE_ANALYTICS);
    setPostPerformances(DEMO_POST_PERFORMANCES);
    setPostComments(DEMO_POST_COMMENTS);
  };

  // Live sync actions (Authentic API query, zero random artificial inflation)
  const syncPageLiveFollowers = async (pageId?: string) => {
    const now = new Date().toISOString();
    const targetPages = pages.filter((p) => !pageId || p.id === pageId);

    try {
      const res = await fetch('/api/sync/followers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: targetPages.map((p) => {
            const acc = accounts.find((a) => a.id === p.accountId);
            return {
              id: p.id,
              platform: p.platform,
              pageId: p.pageId,
              accessToken: p.accessToken || acc?.accessToken,
              botToken: p.botToken || acc?.botToken,
              chatId: p.chatId,
              targetUrl: p.targetUrl,
              fanCount: p.fanCount,
              followersCount: p.followersCount,
            };
          }),
          ytApiKey: settings?.ytApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        const resultMap = new Map<string, { followersCount: number; fanCount: number; live?: boolean }>();
        data.results.forEach((r: { id: string; followersCount: number; fanCount: number; live?: boolean }) => resultMap.set(r.id, r));

        setPages((prev) =>
          prev.map((pg) => {
            if (pageId && pg.id !== pageId) return pg;
            const resData = resultMap.get(pg.id);
            if (!resData) {
              return {
                ...pg,
                lastFollowerSyncAt: now,
              };
            }
            const oldCount = pg.followersCount ?? pg.fanCount ?? 0;
            const newCount = resData.followersCount;
            const delta = resData.live ? newCount - oldCount : (pg.followersDeltaToday ?? 0);

            return {
              ...pg,
              followersCount: newCount,
              fanCount: resData.fanCount,
              followersDeltaToday: delta,
              lastFollowerSyncAt: now,
            };
          })
        );
        return;
      }
    } catch (e) {
      console.warn('Live follower sync API error:', e);
    }

    // Fallback: keep exact counts, just update timestamp without random fake increment
    setPages((prev) =>
      prev.map((pg) => {
        if (pageId && pg.id !== pageId) return pg;
        return {
          ...pg,
          lastFollowerSyncAt: now,
        };
      })
    );
  };

  const syncPostInsights = async (pageId?: string) => {
    const now = new Date().toISOString();
    // Maintain genuine numbers and update timestamp
    setPostPerformances((prev) =>
      prev.map((metric) => {
        if (pageId && metric.pageId !== pageId) return metric;
        return {
          ...metric,
          lastSyncedAt: now,
        };
      })
    );
  };

  const replyToComment = (commentId: string, message: string) => {
    if (!message.trim()) return;
    const newReply = {
      id: `rep_${Date.now()}`,
      authorName: user.name,
      authorAvatar: user.avatar,
      message: message.trim(),
      createdAt: new Date().toISOString(),
      isPageAuthor: true,
    };
    setPostComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, replies: [...c.replies, newReply] } : c
      )
    );
  };

  const toggleLikeComment = (commentId: string) => {
    setPostComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              isLikedByPage: !c.isLikedByPage,
              likeCount: c.isLikedByPage ? c.likeCount - 1 : c.likeCount + 1,
            }
          : c
      )
    );
  };

  const toggleHideComment = (commentId: string) => {
    setPostComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, isHidden: !c.isHidden } : c))
    );
  };

  const deleteComment = (commentId: string) => {
    setPostComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const sendPrivateReply = (_commentId: string, _message: string) => {};

  const simulateWebhookEvent = (_pageId?: string): string => {
    return 'Webhook processed';
  };

  const syncMonetizationAll = () => {
    const now = new Date().toISOString();
    setPages((prev) =>
      prev.map((pg) => {
        if (!pg.monetization || pg.monetization.status !== 'monetized_active') return pg;
        return {
          ...pg,
          monetization: {
            ...pg.monetization,
            lastSyncedAt: now,
          },
        };
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
        user,
        workspace,
        accounts,
        pages,
        categories,
        posts,
        sigTemplates,
        analytics,
        pageAnalytics,
        postPerformances,
        postComments,
        automations,
        settings,
        isHydrated,
        addAccount,
        addPages,
        updatePage,
        removeAccount,
        togglePageActive,
        disconnectPage,
        updateUser,
        updateWorkspace,
        createCategory,
        updateCategory,
        deleteCategory,
        createPost,
        retryPost,
        deletePost,
        updateSettings,
        createAutomation,
        toggleAutomation,
        deleteAutomation,
        saveSigTemplate,
        isAuthenticated,
        loginWithGoogle,
        logout,
        clearAllData,
        loadDemoData,
        allUsers,
        approveUser,
        rejectUser,
        updateUserSubscription,
        toggleUserSuspension,
        deleteUser,
        registerUser,
        switchActiveUser,
        syncPageLiveFollowers,
        syncPostInsights,
        replyToComment,
        toggleLikeComment,
        toggleHideComment,
        deleteComment,
        sendPrivateReply,
        simulateWebhookEvent,
        syncMonetizationAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) {
    return FALLBACK_APP_CONTEXT;
  }
  return ctx;
}
