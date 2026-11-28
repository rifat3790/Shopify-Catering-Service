import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/serverAuth';
import { getUserById, updateUserRole, updateUserBalance, updateUserDue, deleteUser } from '@/lib/dataStore';

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
  const __auth = await requireAdmin(request);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.role) {
      if ((__auth as any).role !== 'super_admin') {
        return NextResponse.json({ success: false, error: 'Only the super admin can change roles.' }, { status: 403 });
      }
      const updated = await updateUserRole(id, body.role, body.email);
      return NextResponse.json({ success: true, data: updated });
    }

    if (body.dueAmount !== undefined || body.dueAction === 'clear') {
      const dAct = body.dueAction === 'clear' ? 'clear' : (body.dueAction === 'deduct' ? 'deduct' : (body.dueAction === 'add' ? 'add' : 'set'));
      const updated = await updateUserDue(id, Number(body.dueAmount) || 0, dAct);
      return NextResponse.json({ success: true, data: updated });
    }

    const amount = body.balanceAmount !== undefined ? body.balanceAmount : body.balanceDelta;
    if (amount !== undefined) {
      const act = body.action === 'deduct' ? 'deduct' : (body.action === 'set' ? 'set' : 'add');
      const updated = await updateUserBalance(id, Number(amount), act);
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const __auth = await requireAdmin(request);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const deleted = await deleteUser(id, email || undefined);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'User not found or already deleted' }, { status: 404 });
    }
    return NextResponse.json({ 
      success: true, 
      message: 'Member profile permanently deleted from database and auth' 
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete member' },
      { status: 500 }
    );
  }
}
