import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/serverAuth';
import { getAllUsers, updateUserRole, updateUserStatus, updateUserBalance, updateUserDue, deleteUser } from '@/lib/dataStore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    let users = await getAllUsers();
    if (role && role !== 'all') {
      users = users.filter(u => u.role === role);
    }
    return NextResponse.json(
      { success: true, data: users },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const __auth = await requireAdmin(request);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const body = await request.json();
    const { userId, email, role, status, balanceDelta, balanceAmount, action, dueAmount, dueAction } = body;

    const idOrEmail = userId || email;
    if (!idOrEmail) {
      return NextResponse.json({ success: false, error: 'User ID or Email is required' }, { status: 400 });
    }

    if (dueAmount !== undefined || dueAction === 'clear') {
      const dAct = dueAction === 'clear' ? 'clear' : (dueAction === 'deduct' ? 'deduct' : (dueAction === 'add' ? 'add' : 'set'));
      const updated = await updateUserDue(idOrEmail, Number(dueAmount) || 0, dAct);
      return NextResponse.json({ 
        success: true, 
        data: updated, 
        message: `Current due successfully ${dAct === 'clear' ? 'cleared' : (dAct === 'set' ? 'set' : (dAct === 'deduct' ? 'reduced' : 'added'))}` 
      });
    }

    if (status) {
      const updated = await updateUserStatus(idOrEmail, status, email);
      return NextResponse.json({ success: true, data: updated, message: `Status updated to ${status}` });
    }

    if (role) {
      if ((__auth as any).role !== 'super_admin') {
        return NextResponse.json({ success: false, error: 'Only the super admin can change roles.' }, { status: 403 });
      }
      const updated = await updateUserRole(idOrEmail, role, email);
      return NextResponse.json({ success: true, data: updated, message: `Role updated to ${role}` });
    }

    const amount = balanceAmount !== undefined ? balanceAmount : balanceDelta;
    if (amount !== undefined) {
      const act = action === 'deduct' ? 'deduct' : (action === 'set' ? 'set' : 'add');
      const updated = await updateUserBalance(idOrEmail, Number(amount), act);
      return NextResponse.json({ 
        success: true, 
        data: updated, 
        message: `Balance successfully ${act === 'set' ? 'set' : (act === 'deduct' ? 'deducted' : 'added')}` 
      });
    }

    return NextResponse.json({ success: false, error: 'No valid action provided' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const __auth = await requireAdmin(request);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId') || searchParams.get('id');
    let email = searchParams.get('email');

    if (!userId && !email) {
      const body = await request.json().catch(() => ({}));
      userId = body.userId || body.id;
      email = body.email;
    }

    const idOrEmail = userId || email;
    if (!idOrEmail) {
      return NextResponse.json({ success: false, error: 'User ID or Email is required' }, { status: 400 });
    }

    const deleted = await deleteUser(idOrEmail, email || undefined);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'User not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Member profile and records permanently deleted from database' 
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete member' },
      { status: 500 }
    );
  }
}
