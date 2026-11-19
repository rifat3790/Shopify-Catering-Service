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
    const { userId, email, name, username, avatar, department, phone, themeColor, customTheme } = body;

    const idOrEmail = userId || email;
    if (!idOrEmail) {
      return NextResponse.json(
        { success: false, error: 'userId or email is required to update profile' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name?.trim();
    if (username !== undefined) updates.username = username?.trim();
    if (avatar !== undefined) updates.avatar = avatar?.trim();
    if (department !== undefined) updates.department = department?.trim();
    if (phone !== undefined) updates.phone = phone?.trim();
    if (themeColor !== undefined) updates.themeColor = themeColor;
    if (customTheme !== undefined) updates.customTheme = customTheme;

    const updated = await updateUserProfile(
      idOrEmail,
      updates,
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
