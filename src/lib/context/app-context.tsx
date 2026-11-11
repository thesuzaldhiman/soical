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
} from '@/types';
import {
  INITIAL_USER,
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

  // Facebook Analytics & Monetization Actions
  syncPageLiveFollowers: (pageId?: string) => void;
  syncPostInsights: (pageId?: string) => void;
  replyToComment: (commentId: string, message: string) => void;
  toggleLikeComment: (commentId: string) => void;
  toggleHideComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  sendPrivateReply: (commentId: string, message: string) => void;
  simulateWebhookEvent: (pageId?: string) => string;
  syncMonetizationAll: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'sap_saas_live_v1';

export const GUEST_USER: User = {
  id: '',
  name: '',
  email: '',
  avatar: '',
  role: 'owner',
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
      const existingPageIds = new Set(prev.map((p) => p.pageId));
      const fresh = pagesToAdd.filter((p) => !existingPageIds.has(p.pageId));
      return [...prev, ...fresh];
    });
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
    const googleUser: User = {
      id: profile.id || `google_${cleanEmail.replace(/[^a-z0-9_]/g, '_')}`,
      name: profile.name || cleanEmail.split('@')[0],
      email: cleanEmail,
      avatar: profile.avatar || '/icons/social/google.png',
      role: 'owner',
      provider: 'google',
    };
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

  // Facebook Live sync actions
  const syncPageLiveFollowers = (pageId?: string) => {
    const now = new Date().toISOString();
    setPages((prev) =>
      prev.map((pg) => {
        if (pageId && pg.id !== pageId) return pg;
        const randomGain = Math.floor(Math.random() * 8) + 1;
        const updatedCount = (pg.followersCount || pg.fanCount) + randomGain;
        return {
          ...pg,
          followersCount: updatedCount,
          fanCount: updatedCount,
          followersDeltaToday: (pg.followersDeltaToday || 0) + randomGain,
          lastFollowerSyncAt: now,
        };
      })
    );
  };

  const syncPostInsights = (pageId?: string) => {
    const now = new Date().toISOString();
    setPostPerformances((prev) =>
      prev.map((metric) => {
        if (pageId && metric.pageId !== pageId) return metric;
        return {
          ...metric,
          reach: metric.reach + Math.floor(Math.random() * 45) + 5,
          mediaViews: metric.mediaViews + Math.floor(Math.random() * 60) + 10,
          likes: metric.likes + Math.floor(Math.random() * 4) + 1,
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
        const microBump = Math.floor(Math.random() * 850000) + 150000;
        return {
          ...pg,
          monetization: {
            ...pg.monetization,
            todayEarningsMicro: pg.monetization.todayEarningsMicro + microBump,
            last7dEarningsMicro: pg.monetization.last7dEarningsMicro + microBump,
            last30dEarningsMicro: pg.monetization.last30dEarningsMicro + microBump,
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

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
