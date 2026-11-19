import { NextResponse } from 'next/server';
import { getAllChatGroups, createChatGroup } from '@/lib/dataStore';

export async function GET() {
  try {
    const groups = await getAllChatGroups();
    return NextResponse.json({ success: true, data: groups });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, createdBy, createdByName, members, avatar } = body;

    if (!name?.trim() || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Group name and creator are required' },
        { status: 400 }
      );
    }

    const group = await createChatGroup({
      name: name.trim(),
      description: description?.trim() || '',
      createdBy,
      createdByName: createdByName || 'Team Member',
      members: members || [],
      avatar,
    });

    return NextResponse.json({ success: true, data: group });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create group' },
      { status: 500 }
    );
  }
}
