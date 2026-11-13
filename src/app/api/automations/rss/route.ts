import { NextRequest, NextResponse } from 'next/server';
import { fetchAndParseRssFeed, RssItem } from '@/lib/services/rss-parser';
import { dispatchToTargets, PublishTarget } from '@/lib/services/publisher';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "url" is required.' },
        { status: 400 }
      );
    }

    const feed = await fetchAndParseRssFeed(url, {
      scrapeMissingImages: true,
      scrapeFullArticle: true,
      maxItems: 8,
    });

    return NextResponse.json({
      success: true,
      feed: {
        title: feed.title,
        description: feed.description,
        link: feed.link,
        itemCount: feed.items.length,
        items: feed.items.slice(0, 10),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch or parse RSS feed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action = 'dispatch', // 'preview' | 'dispatch'
      feedUrl,
      targets = [],
      processedGuids = [],
      maxItems = 3,
      linkInComment = true,
      customCaption = '',
      postStatus = 'published',
      scrapeMissingImages = true,
      scrapeFullArticle = true,
      generatedMediaMap = {}, // Record<string, string> map of item link/id -> generated composite template image
    } = body;

    if (!feedUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: "feedUrl"' },
        { status: 400 }
      );
    }

    // 1. Fetch & Parse RSS Feed (with Auto Engine scraping fallbacks for missing images & full body)
    const feed = await fetchAndParseRssFeed(feedUrl, {
      scrapeMissingImages,
      scrapeFullArticle,
      maxItems,
    });

    // If only preview requested
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        feed: {
          title: feed.title,
          description: feed.description,
          link: feed.link,
          itemCount: feed.items.length,
          items: feed.items.slice(0, 10),
        },
      });
    }

    // 2. Action === 'dispatch'
    if (!targets || targets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No publishing targets selected. Choose at least one connected WordPress website or social page.',
        },
        { status: 400 }
      );
    }

    // Deduplication: Filter out items already processed
    const seenSet = new Set<string>(processedGuids);
    const newItems = feed.items.filter(
      (item) => !seenSet.has(item.id) && !seenSet.has(item.link)
    );

    if (newItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new articles found. All feed items have already been processed.',
        feedTitle: feed.title,
        totalItemsInFeed: feed.items.length,
        newItemsDispatched: 0,
        dispatched: [],
        updatedProcessedGuids: processedGuids,
      });
    }

    // Pick top items according to maxItems limit (default 2-3 to avoid spamming)
    const itemsToProcess = newItems.slice(0, Math.min(maxItems, 5));
    const newlyAddedGuids: string[] = [];
    const dispatchResults: Array<{
      item: { id: string; title: string; link: string; imageUrl?: string };
      results: any[];
    }> = [];

    for (const item of itemsToProcess) {
      // Build social caption
      let caption = '';
      if (customCaption && customCaption.trim()) {
        caption = customCaption
          .replace(/{title}/gi, item.title)
          .replace(/{summary}/gi, item.summary)
          .replace(/{link}/gi, item.link);
      } else {
        caption = `${item.title}\n\n${item.summary}`;
        if (!linkInComment && item.link) {
          caption += `\n\n👉 पूरा पढ़ें: ${item.link}`;
        }
      }

      // First comment link (improves Facebook organic reach)
      const comment =
        linkInComment && item.link
          ? `👉 पूरी खबर और विस्तृत जानकारी के लिए यहाँ पढ़ें:\n${item.link}`
          : '';

      // Use generated template card image if available, else scraped image
      const finalMediaUrl =
        generatedMediaMap[item.id] || generatedMediaMap[item.link] || item.imageUrl || '';

      const isDraftMode = postStatus === 'draft';
      let targetResults: any[] = [];

      if (isDraftMode) {
        // Safe Draft Mode: Prepare card image and formatted caption, but DO NOT dispatch live to Facebook or external APIs yet!
        targetResults = (targets as PublishTarget[]).map((t) => ({
          pageId: t.id,
          platform: t.platform,
          pageName: t.name,
          status: 'draft',
          externalPostId: '',
          timestamp: new Date().toISOString(),
        }));
      } else {
        // Live auto-publishing mode
        targetResults = await dispatchToTargets({
          postType: finalMediaUrl ? 'image' : 'text',
          title: item.title,
          message: caption,
          mediaUrl: finalMediaUrl,
          linkUrl: item.link || '',
          commentText: comment,
          contentHtml: item.content || item.summary,
          targets: targets as PublishTarget[],
        });
      }

      dispatchResults.push({
        item: {
          id: item.id,
          title: item.title,
          link: item.link,
          imageUrl: finalMediaUrl,
        },
        results: targetResults,
      });

      newlyAddedGuids.push(item.id);
      if (item.link) newlyAddedGuids.push(item.link);
    }

    // Merge updated GUIDs (keep last 500)
    const updatedProcessedGuids = Array.from(new Set([...newlyAddedGuids, ...processedGuids])).slice(
      0,
      500
    );

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${itemsToProcess.length} new article(s) from "${feed.title}".`,
      feedTitle: feed.title,
      totalItemsInFeed: feed.items.length,
      newItemsDispatched: itemsToProcess.length,
      dispatched: dispatchResults,
      updatedProcessedGuids,
      executedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Automation RSS dispatch error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
