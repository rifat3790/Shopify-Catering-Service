import { NextResponse } from 'next/server';
import { toggleBlockUser } from '@/lib/dataStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currentUserId, targetUserId } = body;

    if (!currentUserId || !targetUserId) {
      return NextResponse.json(
        { success: false, error: 'currentUserId and targetUserId are required' },
        { status: 400 }
      );
    }

    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot block yourself' },
        { status: 400 }
      );
    }

    const result = await toggleBlockUser(currentUserId, targetUserId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to toggle block status' },
      { status: 500 }
    );
  }
}
