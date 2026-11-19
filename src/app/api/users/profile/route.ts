import { NextResponse } from 'next/server';
import { updateUserProfile, getAllUsers } from '@/lib/dataStore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idOrEmail = searchParams.get('id') || searchParams.get('email');
    if (!idOrEmail) {
      return NextResponse.json({ success: false, error: 'User ID or Email is required' }, { status: 400 });
    }

    const all = await getAllUsers();
    const clean = idOrEmail.toLowerCase().trim();
    const user = all.find(u => u.id === idOrEmail || u.email.toLowerCase() === clean);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, name, username, avatar, department, phone } = body;

    const idOrEmail = userId || email;
    if (!idOrEmail) {
      return NextResponse.json(
        { success: false, error: 'userId or email is required to update profile' },
        { status: 400 }
      );
    }

    const updated = await updateUserProfile(
      idOrEmail,
      {
        name: name?.trim(),
        username: username?.trim(),
        avatar: avatar?.trim(),
        department: department?.trim(),
        phone: phone?.trim(),
      },
      email?.trim()
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
