'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  Workspace,
  SocialAccount,
  SocialPage,
  PageCategory,
  Post,
  SigTemplate,
  AnalyticsMetric,
  AutomationFeed,
  AppSettings,
  Platform,
  PageAnalyticsSnapshot,
  PostPerformanceMetric,
  PostComment,
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
  addAccount: (platform: Platform, name: string) => void;
  removeAccount: (id: string) => void;
  togglePageActive: (id: string) => void;
  disconnectPage: (id: string) => void;
  updateUser: (userData: Partial<User>) => void;
  updateWorkspace: (workspaceData: Partial<Workspace>) => void;
  createCategory: (name: string, color: string, pageIds: string[], tags: string[]) => void;
  updateCategory: (category: PageCategory) => void;
  deleteCategory: (id: string) => void;
  createPost: (postData: Omit<Post, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'results'>) => Post;
  retryPost: (postId: string) => void;
  deletePost: (postId: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  createAutomation: (feed: Omit<AutomationFeed, 'id' | 'itemsProcessed'>) => void;
  toggleAutomation: (id: string) => void;
  deleteAutomation: (id: string) => void;
  saveSigTemplate: (template: SigTemplate) => void;

  // Facebook Analytics, Comments & Monetization Actions (Demo / Ready for Graph API)
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

const STORAGE_KEY = 'sap_saas_app_state_v2';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(INITIAL_USER);
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
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.pages) setPages(parsed.pages);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.posts) setPosts(parsed.posts);
        if (parsed.sigTemplates) setSigTemplates(parsed.sigTemplates);
        if (parsed.pageAnalytics) setPageAnalytics(parsed.pageAnalytics);
        if (parsed.postPerformances) setPostPerformances(parsed.postPerformances);
        if (parsed.postComments) setPostComments(parsed.postComments);
        if (parsed.automations) setAutomations(parsed.automations);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.workspace) setWorkspace(parsed.workspace);
      }
    } catch (e) {
      console.error('Failed to load state from localStorage:', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage on state changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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
  ]);

  const addAccount = (platform: Platform, name: string) => {
    const newAcc: SocialAccount = {
      id: `acc_${platform}_${Date.now()}`,
      platform,
      accountId: `ext_${Date.now()}`,
      name,
      avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
      status: 'active',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      lastCheckedAt: new Date().toISOString(),
    };
    setAccounts((prev) => [newAcc, ...prev]);

    // Also auto-add a default page for this account
    const newPage: SocialPage = {
      id: `pg_${Date.now()}`,
      accountId: newAcc.id,
      platform,
      pageId: `pid_${Date.now()}`,
      name: `${name} (Channel)`,
      avatarUrl: newAcc.avatarUrl,
      fanCount: Math.floor(Math.random() * 50000) + 1200,
      isActive: true,
      category: `${platform.toUpperCase()} Target`,
    };
    setPages((prev) => [...prev, newPage]);
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

  const createPost = (postData: Omit<Post, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'results'>): Post => {
    const isNow = postData.status === 'published';
    const postResults = isNow
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
      publishedAt: isNow ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPosts((prev) => [newPost, ...prev]);

    // Update monthly usage count
    setWorkspace((prev) => ({
      ...prev,
      monthlyPostsUsed: prev.monthlyPostsUsed + (isNow ? postData.pageIds.length : 1),
    }));

    return newPost;
  };

  const retryPost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const updatedResults = p.pageIds.map((pid) => {
          const pg = pages.find((page) => page.id === pid);
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
          ...p,
          status: 'published',
          publishedAt: new Date().toISOString(),
          results: updatedResults,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const deletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const createAutomation = (feedData: Omit<AutomationFeed, 'id' | 'itemsProcessed'>) => {
    const newFeed: AutomationFeed = {
      ...feedData,
      id: `auto_${Date.now()}`,
      itemsProcessed: 0,
      lastCheckedAt: new Date().toISOString(),
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

  // Sync live followers_count for a specific page or all Facebook pages
  const syncPageLiveFollowers = (pageId?: string) => {
    const now = new Date().toISOString();
    setPages((prev) =>
      prev.map((pg) => {
        if (pg.platform !== 'facebook') return pg;
        if (pageId && pg.id !== pageId) return pg;
        const bump = Math.floor(Math.random() * 14) + 3;
        const currentFollowers = pg.followersCount ?? pg.fanCount;
        return {
          ...pg,
          followersCount: currentFollowers + bump,
          followersDeltaToday: (pg.followersDeltaToday ?? 0) + bump,
          lastFollowerSyncAt: now,
        };
      })
    );

    setPageAnalytics((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((pid) => {
        if (pageId && pid !== pageId) return;
        const bump = Math.floor(Math.random() * 14) + 3;
        next[pid] = {
          ...next[pid],
          followersCount: next[pid].followersCount + bump,
          followersDeltaToday: next[pid].followersDeltaToday + bump,
          lastSyncedAt: now,
        };
      });
      return next;
    });
  };

  // Sync post insights (post_total_media_view_unique, post_media_view, reactions, shares)
  const syncPostInsights = (pageId?: string) => {
    const now = new Date().toISOString();
    setPostPerformances((prev) =>
      prev.map((item) => {
        if (pageId && item.pageId !== pageId) return item;
        const reachBump = Math.floor(Math.random() * 420) + 60;
        const viewsBump = reachBump + Math.floor(Math.random() * 250) + 40;
        const likeBump = Math.floor(Math.random() * 28) + 4;
        const loveBump = Math.floor(Math.random() * 9) + 1;
        const shareBump = Math.floor(Math.random() * 5);
        return {
          ...item,
          reach: item.reach + reachBump,
          mediaViews: item.mediaViews + viewsBump,
          likes: item.likes + likeBump + loveBump,
          reactions: {
            ...item.reactions,
            like: item.reactions.like + likeBump,
            love: item.reactions.love + loveBump,
          },
          sharesCount: item.sharesCount + shareBump,
          lastSyncedAt: now,
        };
      })
    );
  };

  // Reply to a Facebook comment as the Page
  const replyToComment = (commentId: string, message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    let targetExternalPostId = '';

    setPostComments((prev) =>
      prev.map((cmt) => {
        if (cmt.id !== commentId) return cmt;
        targetExternalPostId = cmt.externalPostId;
        const page = pages.find((p) => p.id === cmt.pageId);
        return {
          ...cmt,
          replies: [
            ...cmt.replies,
            {
              id: `rep_${Date.now()}`,
              authorName: page?.name || 'Page Admin',
              authorAvatar: page?.avatarUrl,
              isPageAuthor: true,
              message: trimmed,
              createdAt: now,
            },
          ],
        };
      })
    );

    if (targetExternalPostId) {
      setPostPerformances((prev) =>
        prev.map((p) =>
          p.externalPostId === targetExternalPostId
            ? { ...p, commentsCount: p.commentsCount + 1, lastSyncedAt: now }
            : p
        )
      );
    }
  };

  const toggleLikeComment = (commentId: string) => {
    setPostComments((prev) =>
      prev.map((cmt) => {
        if (cmt.id !== commentId) return cmt;
        const nextLiked = !cmt.isLikedByPage;
        return {
          ...cmt,
          isLikedByPage: nextLiked,
          likeCount: Math.max(0, cmt.likeCount + (nextLiked ? 1 : -1)),
        };
      })
    );
  };

  const toggleHideComment = (commentId: string) => {
    setPostComments((prev) =>
      prev.map((cmt) => (cmt.id === commentId ? { ...cmt, isHidden: !cmt.isHidden } : cmt))
    );
  };

  const deleteComment = (commentId: string) => {
    const target = postComments.find((c) => c.id === commentId);
    setPostComments((prev) => prev.filter((c) => c.id !== commentId));
    if (target) {
      setPostPerformances((prev) =>
        prev.map((p) =>
          p.externalPostId === target.externalPostId
            ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) }
            : p
        )
      );
    }
  };

  const sendPrivateReply = (commentId: string, message: string) => {
    if (!message.trim()) return;
    setPostComments((prev) =>
      prev.map((cmt) => (cmt.id === commentId ? { ...cmt, privateReplySent: true } : cmt))
    );
  };

  // Simulate an incoming Meta `feed` webhook notification (comment + reaction)
  const simulateWebhookEvent = (pageId?: string): string => {
    const candidates = postPerformances.filter((p) => !pageId || p.pageId === pageId);
    const targetPost = candidates[0] || postPerformances[0];
    if (!targetPost) return 'No Facebook posts available to simulate.';

    const now = new Date().toISOString();
    const sampleComments = [
      'Bhai ye update bilkul sahi time par diya, dhanyavaad!',
      'Latest status kya hai abhi? Please reply.',
      'Awesome coverage! Shared in our local group.',
      'Kya kal bhi yahi timing rahegi?',
    ];
    const sampleAuthors = ['Amit Sharma', 'Pooja Thakur', 'Rohan Mehta', 'Kavita Negi'];
    const idx = Math.floor(Math.random() * sampleComments.length);

    const newComment: PostComment = {
      id: `cmt_wh_${Date.now()}`,
      postId: targetPost.postId,
      pageId: targetPost.pageId,
      externalPostId: targetPost.externalPostId,
      authorName: sampleAuthors[idx],
      message: sampleComments[idx],
      createdAt: now,
      likeCount: 0,
      replies: [],
    };

    setPostComments((prev) => [newComment, ...prev]);
    setPostPerformances((prev) =>
      prev.map((p) =>
        p.id === targetPost.id
          ? {
              ...p,
              commentsCount: p.commentsCount + 1,
              likes: p.likes + 5,
              reactions: {
                ...p.reactions,
                like: p.reactions.like + 3,
                love: p.reactions.love + 2,
              },
              lastSyncedAt: now,
            }
          : p
      )
    );

    return `Webhook [feed]: New comment & +5 reactions on "${targetPost.pageName}"`;
  };

  // Simulate batch scan of all Facebook pages for earnings & integrity
  const syncMonetizationAll = () => {
    const now = new Date().toISOString();
    setPages((prev) =>
      prev.map((pg) => {
        if (pg.platform !== 'facebook' || !pg.monetization) return pg;
        if (pg.monetization.status !== 'monetized_active') {
          return {
            ...pg,
            monetization: {
              ...pg.monetization,
              lastSyncedAt: now,
            },
          };
        }
        const microBump = (Math.floor(Math.random() * 180) + 35) * 10000; // $0.35 - $2.15
        return {
          ...pg,
          monetization: {
            ...pg.monetization,
            todayEarningsMicro: pg.monetization.todayEarningsMicro + microBump,
            last7dEarningsMicro: pg.monetization.last7dEarningsMicro + microBump,
            last30dEarningsMicro: pg.monetization.last30dEarningsMicro + microBump,
            breakdownByFormatMicro: {
              ...pg.monetization.breakdownByFormatMicro,
              photosAndText: pg.monetization.breakdownByFormatMicro.photosAndText + Math.round(microBump * 0.6),
              reels: pg.monetization.breakdownByFormatMicro.reels + Math.round(microBump * 0.4),
            },
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
