import { NextResponse } from 'next/server';
import { getRequester, isAdminRole, isSelf, unauthorized, forbidden } from '@/lib/serverAuth';
import { syncUser } from '@/lib/dataStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, name, email, avatar, allowRevive } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    // Only the signed-in user may sync their own account; admins may add / revive members
    const who = await getRequester(request);
    if (!who) return unauthorized();
    if (!isAdminRole(who) && !isSelf(who, email, uid)) {
      return forbidden('You can only sync your own account.');
    }

    const user = await syncUser({ uid, name, email, avatar, allowRevive });
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync user' },
      { status: 500 }
    );
  }
}

