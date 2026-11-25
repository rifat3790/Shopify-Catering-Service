import { NextResponse } from 'next/server';
import { 
  updateChatGroup, 
  addMembersToGroup, 
  removeMemberFromGroup, 
  toggleGroupAdmin, 
  deleteChatGroup 
} from '@/lib/dataStore';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const body = await request.json();
    const { action, requesterId, ...payload } = body;

    if (!groupId || !requesterId) {
      return NextResponse.json(
        { success: false, error: 'Group ID and requester ID are required' },
        { status: 400 }
      );
    }

    let updatedGroup = null;

    if (action === 'update_settings') {
      const { name, description, avatar } = payload;
      updatedGroup = await updateChatGroup(groupId, { name, description, avatar }, requesterId);
    } else if (action === 'add_members') {
      const { memberIds } = payload;
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return NextResponse.json({ success: false, error: 'memberIds array is required' }, { status: 400 });
      }
      updatedGroup = await addMembersToGroup(groupId, memberIds, requesterId);
    } else if (action === 'remove_member') {
      const { targetUserId } = payload;
      if (!targetUserId) {
        return NextResponse.json({ success: false, error: 'targetUserId is required' }, { status: 400 });
      }
      updatedGroup = await removeMemberFromGroup(groupId, targetUserId, requesterId);
    } else if (action === 'toggle_admin') {
      const { targetUserId } = payload;
      if (!targetUserId) {
        return NextResponse.json({ success: false, error: 'targetUserId is required' }, { status: 400 });
      }
      updatedGroup = await toggleGroupAdmin(groupId, targetUserId, requesterId);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
    }

    if (!updatedGroup) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedGroup });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Operation failed' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get('requesterId');
    const requesterEmail = searchParams.get('requesterEmail') || searchParams.get('email') || undefined;

    if (!groupId || !requesterId) {
      return NextResponse.json(
        { success: false, error: 'Group ID and requesterId query parameter are required' },
        { status: 400 }
      );
    }

    const success = await deleteChatGroup(groupId, requesterId, requesterEmail);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Group not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Group deleted permanently' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete group' },
      { status: 400 }
    );
  }
}
