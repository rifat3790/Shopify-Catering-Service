import { NextResponse } from 'next/server';
import { syncUser } from '@/lib/dataStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, name, email, avatar } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const user = await syncUser({ uid, name, email, avatar });
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync user' },
      { status: 500 }
    );
  }
}

