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
  automations: AutomationFeed[];
  settings: AppSettings;
  isHydrated: boolean;

  // Actions
  addAccount: (platform: Platform, name: string) => void;
  removeAccount: (id: string) => void;
  togglePageActive: (id: string) => void;
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
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'sap_saas_app_state_v1';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user] = useState<User>(INITIAL_USER);
  const [workspace, setWorkspace] = useState<Workspace>(INITIAL_WORKSPACE);
  const [accounts, setAccounts] = useState<SocialAccount[]>(INITIAL_ACCOUNTS);
  const [pages, setPages] = useState<SocialPage[]>(INITIAL_PAGES);
  const [categories, setCategories] = useState<PageCategory[]>(INITIAL_CATEGORIES);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [sigTemplates, setSigTemplates] = useState<SigTemplate[]>(INITIAL_SIG_TEMPLATES);
  const [analytics] = useState<AnalyticsMetric[]>(INITIAL_ANALYTICS);
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
        automations,
        settings,
        workspace,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }, [accounts, pages, categories, posts, sigTemplates, automations, settings, workspace, isHydrated]);

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
        automations,
        settings,
        isHydrated,
        addAccount,
        removeAccount,
        togglePageActive,
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
