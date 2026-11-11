import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botToken, chatId } = body;

    if (!botToken || !botToken.trim()) {
      return NextResponse.json(
        { success: false, error: 'Telegram Bot Token is required.' },
        { status: 400 }
      );
    }

    if (!chatId || !chatId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Telegram Channel username (e.g. @mychannel) or Chat ID is required.' },
        { status: 400 }
      );
    }

    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();

    // 1. Verify Bot Token with getMe
    const getMeRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const getMeData = await getMeRes.json();

    if (!getMeData.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid Telegram Bot Token: ${getMeData.description || 'Unauthorized'}. Please generate a valid token from @BotFather.`,
        },
        { status: 400 }
      );
    }

    const botUser = getMeData.result;

    // 2. Verify Channel / Chat with getChat
    const getChatRes = await fetch(
      `https://api.telegram.org/bot${cleanToken}/getChat?chat_id=${encodeURIComponent(cleanChatId)}`
    );
    const getChatData = await getChatRes.json();

    if (!getChatData.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not access ${cleanChatId}: ${getChatData.description || 'Chat not found'}. Make sure your bot (@${botUser.username}) is added as an Administrator to this channel with "Post Messages" permission.`,
        },
        { status: 400 }
      );
    }

    const chat = getChatData.result;

    // 3. Optional: Get Member Count
    let memberCount = 0;
    try {
      const getCountRes = await fetch(
        `https://api.telegram.org/bot${cleanToken}/getChatMemberCount?chat_id=${encodeURIComponent(cleanChatId)}`
      );
      const getCountData = await getCountRes.json();
      if (getCountData.ok) {
        memberCount = getCountData.result;
      }
    } catch {
      memberCount = 0;
    }

    return NextResponse.json({
      success: true,
      bot: {
        id: String(botUser.id),
        name: botUser.first_name,
        username: botUser.username,
      },
      channel: {
        id: String(chat.id),
        title: chat.title || `@${chat.username}` || 'Telegram Channel',
        username: chat.username || '',
        memberCount: memberCount || 1,
        type: chat.type,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: `Failed to connect Telegram: ${message}` },
      { status: 500 }
    );
  }
}
