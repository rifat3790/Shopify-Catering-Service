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
    const callId = searchParams.get('callId') || undefined;

    if (!userId && !userEmail && !callId) {
      return NextResponse.json(
        { success: false, error: 'userId, userEmail or callId is required' },
        { status: 400 }
      );
    }

    const session = await getCallSessionForUser(userId || '', userEmail, callId);
    return NextResponse.json(
      { success: true, session },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get call session' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Support both application/json and navigator.sendBeacon text/plain JSON payloads
    const rawText = await request.text();
    const body = rawText ? JSON.parse(rawText) : {};
    const { action } = body;

    if (action === 'initiate') {
      const {
        callerId,
        callerEmail,
        callerName,
        callerAvatar,
        receiverId,
        receiverEmail,
        receiverName,
        receiverAvatar,
        isGroup,
        groupId,
        groupName,
        groupMemberIds,
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
        callerEmail,
        callerName: callerName || 'Caller',
        callerAvatar,
        receiverId,
        receiverEmail,
        receiverName: receiverName || 'Receiver',
        receiverAvatar,
        isGroup: !!isGroup,
        groupId,
        groupName,
        groupMemberIds,
        offer
      });

      return NextResponse.json({ success: true, session });
    }

    if (action === 'signal') {
      const { callId, status, offer, answer, iceCandidate, iceCandidates, senderId, senderEmail } = body;
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
        iceCandidates,
        senderId,
        senderEmail
      });

      return NextResponse.json({ success: true, session });
    }

    if (action === 'end') {
      const { callId, senderId } = body;
      if (callId) {
        await endCallSession(callId, senderId);
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
