import { NextResponse } from 'next/server';
import { 
  initiateCallSession, 
  getCallSessionForUser, 
  updateCallSignal, 
  endCallSession 
} from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('userEmail') || undefined;

    if (!userId && !userEmail) {
      return NextResponse.json(
        { success: false, error: 'userId or userEmail is required' },
        { status: 400 }
      );
    }

    const session = await getCallSessionForUser(userId || '', userEmail);
    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get call session' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'initiate') {
      const { 
        callerId, 
        callerName, 
        callerAvatar, 
        receiverId, 
        receiverName, 
        receiverAvatar, 
        isGroup, 
        groupId, 
        groupName, 
        offer 
      } = body;

      if (!callerId || !receiverId) {
        return NextResponse.json(
          { success: false, error: 'callerId and receiverId are required' },
          { status: 400 }
        );
      }

      const session = await initiateCallSession({
        callerId,
        callerName: callerName || 'Caller',
        callerAvatar,
        receiverId,
        receiverName: receiverName || 'Receiver',
        receiverAvatar,
        isGroup: !!isGroup,
        groupId,
        groupName,
        offer
      });

      return NextResponse.json({ success: true, session });
    }

    if (action === 'signal') {
      const { callId, status, offer, answer, iceCandidate, senderId } = body;
      if (!callId) {
        return NextResponse.json(
          { success: false, error: 'callId is required for signal update' },
          { status: 400 }
        );
      }

      const session = await updateCallSignal(callId, {
        status,
        offer,
        answer,
        iceCandidate,
        senderId
      });

      return NextResponse.json({ success: true, session });
    }

    if (action === 'end') {
      const { callId } = body;
      if (callId) {
        await updateCallSignal(callId, { status: 'ended' });
        await endCallSession(callId);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Call operation failed' },
      { status: 500 }
    );
  }
}
