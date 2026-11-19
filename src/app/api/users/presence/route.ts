import { NextResponse } from 'next/server';
import { updateUserPresence } from '@/lib/dataStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, isOnline = true } = body;

    const idToUse = userId || email;
    if (!idToUse) {
      return NextResponse.json({ success: false, error: 'User identifier required' }, { status: 400 });
    }

    await updateUserPresence(idToUse, Boolean(isOnline));
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Presence update failed' },
      { status: 500 }
    );
  }
}
