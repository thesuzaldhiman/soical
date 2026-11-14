#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const APP_URL = (process.env.APP_API_URL || 'https://game.khabarmonkey.com').replace(/\/+$/, '');
const MCP_SECRET = process.env.MCP_SECRET_KEY || 'sap_mcp_live_secret_99x8a7b6c5d4e3';
const DEFAULT_USER_EMAIL = (process.env.USER_EMAIL || 'suzaldhiman@gmail.com').toLowerCase().trim();

/**
 * Helper to call the Social Auto Poster MCP API endpoint scoped to a specific user account email
 */
async function callAppApi(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  bodyData?: any,
  emailOverride?: string
) {
  const url = new URL(`${APP_URL}${endpoint}`);
  url.searchParams.set('secret', MCP_SECRET);

  const targetEmail = (emailOverride || DEFAULT_USER_EMAIL).toLowerCase().trim();
  if (!url.searchParams.has('email')) {
    url.searchParams.set('email', targetEmail);
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-mcp-secret': MCP_SECRET,
    },
  };

  if (method === 'POST') {
    const payload = {
      email: targetEmail,
      ...(bodyData || {}),
    };
    options.body = JSON.stringify(payload);
  }

  try {
    const res = await fetch(url.toString(), options);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `API returned HTTP ${res.status}`);
    }
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to communicate with Social Auto Poster App (${APP_URL}) for user [${targetEmail}]: ${msg}`);
  }
}

const server = new Server(
  {
    name: 'social-poster-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define MCP Tools with User Account Scoping
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_targets',
        description:
          'Lists all connected destinations (WordPress sites, Facebook Pages, Telegram channels) and configured Page Categories belonging to the connected user account. Shows which pages belong to which category so you can target by Category name, by WordPress only, or by specific page IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'User account email (defaults to the currently authenticated account: suzaldhiman@gmail.com). Allows multi-tenant account isolation.',
              default: DEFAULT_USER_EMAIL,
            },
            filterMode: {
              type: 'string',
              enum: ['all', 'wordpress_only', 'social_only'],
              description: 'Filter destinations by platform type.',
              default: 'all',
            },
          },
        },
      },
      {
        name: 'schedule_posts',
        description:
          'Schedules single or bulk posts (up to 150 posts) across WordPress websites, Facebook Pages, or whole Categories for the user account. Supports automated interval spacing (e.g. every 45 mins), start times, rich HTML content for WordPress, featured images, and Facebook first comment links.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'User account email (defaults to suzaldhiman@gmail.com).',
              default: DEFAULT_USER_EMAIL,
            },
            targetMode: {
              type: 'string',
              enum: ['wordpress_only', 'social_only', 'all'],
              description: 'Whether to target WordPress sites only, Social media pages only, or all destinations.',
              default: 'all',
            },
            targetCategoryNames: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Names of Page Categories to target (e.g. ["Breaking News & Alerts", "Technology"]). All pages belonging to these categories will receive the post automatically.',
            },
            targetPageIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Explicit destination page IDs if targeting specific sites or pages directly.',
            },
            startDate: {
              type: 'string',
              description: 'Date to begin scheduling (format: YYYY-MM-DD, e.g. "2026-11-15"). Defaults to today.',
            },
            startTime: {
              type: 'string',
              description: 'Time of day to start posting (format: "HH:mm" e.g. "10:00" or ISO string).',
            },
            intervalMinutes: {
              type: 'number',
              description: 'Minutes between successive posts in the batch (e.g. 45). Automatically spaces out all posts.',
              default: 45,
            },
            jitterMinutes: {
              type: 'number',
              description: 'Optional random jitter (+/- minutes) to make publishing cadence look organic.',
              default: 5,
            },
            posts: {
              type: 'array',
              description: 'Array of posts to schedule.',
              items: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'Headline / WordPress title / Card title.',
                  },
                  message: {
                    type: 'string',
                    description: 'Social media caption, short description, or news body.',
                  },
                  contentHtml: {
                    type: 'string',
                    description: 'Optional rich HTML content for full WordPress blog articles (paragraphs, headings, lists).',
                  },
                  mediaUrl: {
                    type: 'string',
                    description: 'Public URL of image, infographic, or WordPress featured image.',
                  },
                  linkUrl: {
                    type: 'string',
                    description: 'Optional reference link or article URL.',
                  },
                  commentText: {
                    type: 'string',
                    description: 'First comment text (e.g. link in comment for anti-ban & reach preservation).',
                  },
                  postType: {
                    type: 'string',
                    enum: ['text', 'image', 'video', 'link'],
                    description: 'Type of post (defaults to "image" if mediaUrl present, else "text").',
                  },
                  wpCategory: {
                    type: 'string',
                    description: 'WordPress category name (e.g. "Technology", "Himachal News").',
                  },
                  wpTags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'WordPress tags for SEO.',
                  },
                  scheduledAt: {
                    type: 'string',
                    description: 'Optional explicit ISO datetime string override for this specific post.',
                  },
                },
                required: ['message'],
              },
            },
            publishNow: {
              type: 'boolean',
              description: 'Set to true to publish live immediately instead of scheduling.',
              default: false,
            },
          },
          required: ['posts'],
        },
      },
      {
        name: 'get_queue_status',
        description: 'Checks current scheduled queue, count of pending dispatches, and next available publishing time slot for the user account.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'User email account to inspect (defaults to suzaldhiman@gmail.com).',
              default: DEFAULT_USER_EMAIL,
            },
          },
        },
      },
      {
        name: 'publish_instant_post',
        description: 'Publishes a single post live right now across WordPress sites, Facebook Pages, or categories without queuing.',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'User account email (defaults to suzaldhiman@gmail.com)', default: DEFAULT_USER_EMAIL },
            title: { type: 'string', description: 'Title or headline' },
            message: { type: 'string', description: 'Post caption or text' },
            contentHtml: { type: 'string', description: 'Rich HTML body for WordPress' },
            mediaUrl: { type: 'string', description: 'Image or featured image URL' },
            commentText: { type: 'string', description: 'First comment text' },
            targetMode: { type: 'string', enum: ['wordpress_only', 'social_only', 'all'], default: 'all' },
            targetCategoryNames: { type: 'array', items: { type: 'string' } },
            targetPageIds: { type: 'array', items: { type: 'string' } },
          },
          required: ['message'],
        },
      },
    ],
  };
});

// Tool Handlers
server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;
  const userEmail = (args?.email as string) || DEFAULT_USER_EMAIL;

  try {
    if (name === 'list_targets') {
      const data = await callAppApi(
        `/api/mcp?action=targets&email=${encodeURIComponent(userEmail)}`,
        'GET',
        undefined,
        userEmail
      );
      const filter = (args?.filterMode as string) || 'all';

      let wp = data.wordpressSites || [];
      let social = data.socialPages || [];

      if (filter === 'wordpress_only') social = [];
      if (filter === 'social_only') wp = [];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                userEmail,
                summary: `Account [${userEmail}]: Found ${wp.length} WordPress site(s), ${social.length} social page(s), and ${data.categories?.length || 0} category groups.`,
                wordpressSites: wp,
                socialPages: social,
                categories: data.categories || [],
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'schedule_posts') {
      const payload = {
        ...args,
        email: userEmail,
      };
      const data = await callAppApi('/api/mcp', 'POST', payload, userEmail);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    if (name === 'get_queue_status') {
      const endpoint = `/api/mcp?action=queue&email=${encodeURIComponent(userEmail)}`;
      const data = await callAppApi(endpoint, 'GET', undefined, userEmail);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    if (name === 'publish_instant_post') {
      const payload = {
        action: 'schedule',
        publishNow: true,
        email: userEmail,
        targetMode: args?.targetMode || 'all',
        targetCategoryNames: args?.targetCategoryNames || [],
        targetPageIds: args?.targetPageIds || [],
        posts: [
          {
            title: args?.title,
            message: args?.message,
            contentHtml: args?.contentHtml,
            mediaUrl: args?.mediaUrl,
            commentText: args?.commentText,
          },
        ],
      };
      const data = await callAppApi('/api/mcp', 'POST', payload, userEmail);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing tool "${name}" for account [${userEmail}]: ${errorMsg}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Social Poster MCP Server running on stdio for user [${DEFAULT_USER_EMAIL}]`);
}

main().catch((err) => {
  console.error('Fatal MCP Server error:', err);
  process.exit(1);
});
