import { NextResponse } from 'next/server';
import { getAllUsers, updateUserRole, updateUserBalance } from '@/lib/dataStore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    let users = await getAllUsers();
    if (role && role !== 'all') {
      users = users.filter(u => u.role === role);
    }
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, role, balanceDelta, action } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    if (role) {
      const updated = await updateUserRole(userId, role);
      return NextResponse.json({ success: true, data: updated, message: `Role updated to ${role}` });
    }

    if (balanceDelta !== undefined) {
      const updated = await updateUserBalance(userId, Number(balanceDelta), action || 'add');
      return NextResponse.json({ success: true, data: updated, message: `Balance updated` });
    }

    return NextResponse.json({ success: false, error: 'No valid action provided' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}

