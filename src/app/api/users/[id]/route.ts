import { NextResponse } from 'next/server';
import { getUserById, updateUserRole, updateUserBalance } from '@/lib/dataStore';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.role) {
      const updated = await updateUserRole(id, body.role);
      return NextResponse.json({ success: true, data: updated });
    }

    if (body.balanceDelta !== undefined) {
      const updated = await updateUserBalance(id, Number(body.balanceDelta), body.action || 'add');
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

