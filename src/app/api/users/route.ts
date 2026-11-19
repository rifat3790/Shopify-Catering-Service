import { NextResponse } from 'next/server';
import { getAllUsers, updateUserRole, updateUserBalance, deleteUser } from '@/lib/dataStore';

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
    const { userId, email, role, balanceDelta, balanceAmount, action } = body;

    const idOrEmail = userId || email;
    if (!idOrEmail) {
      return NextResponse.json({ success: false, error: 'User ID or Email is required' }, { status: 400 });
    }

    if (role) {
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
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId') || searchParams.get('id');

    if (!userId) {
      const body = await request.json().catch(() => ({}));
      userId = body.userId || body.id;
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const deleted = await deleteUser(userId);
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
