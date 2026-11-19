import { NextResponse } from 'next/server';
import { getChatMessages, sendChatMessage } from '@/lib/dataStore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId1 = searchParams.get('userId1') || undefined;
    const userId2 = searchParams.get('userId2') || undefined;
    const groupId = searchParams.get('groupId') || undefined;

    const messages = await getChatMessages({ userId1, userId2, groupId });
    return NextResponse.json({ success: true, data: messages });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderId, senderName, senderAvatar, receiverId, groupId, text } = body;

    if (!senderId || !senderName || !text?.trim()) {
      return NextResponse.json(
        { success: false, error: 'senderId, senderName, and text are required' },
        { status: 400 }
      );
    }

    const message = await sendChatMessage({
      senderId,
      senderName,
      senderAvatar,
      receiverId,
      groupId,
      text: text.trim(),
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
