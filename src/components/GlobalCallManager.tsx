'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import IncomingCallDialog from '@/components/IncomingCallDialog';
import AudioCallModal from '@/components/AudioCallModal';

export default function GlobalCallManager() {
  const { user } = useAuth();
  const pathname = usePathname();

  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCallSession, setActiveCallSession] = useState<any>(null);
  const [isAudioCallOpen, setIsAudioCallOpen] = useState(false);
  const declinedCallIdsRef = useRef<Set<string>>(new Set());
  const incomingCallRef = useRef<any>(null);
  incomingCallRef.current = incomingCall;

  // If user is currently on /chat, /chat already has its own dedicated handler
  const isChatPage = pathname?.startsWith('/chat');

  useEffect(() => {
    if (!user || isChatPage) {
      if (incomingCallRef.current) setIncomingCall(null);
      return;
    }

    const checkIncoming = async () => {
      if (isAudioCallOpen) return;

      try {
        const queryId = user.uid || '';
        const queryEmail = user.email || '';
        const res = await fetch(
          `/api/chat/call?userId=${encodeURIComponent(queryId)}&userEmail=${encodeURIComponent(queryEmail)}&t=${Date.now()}`,
          { cache: 'no-store' }
        );
        const json = await res.json();
        const session = json?.session;

        if (session && session.status === 'ringing') {
          if (declinedCallIdsRef.current.has(session.callId)) {
            if (incomingCallRef.current) setIncomingCall(null);
            return;
          }
          const myId = (user.uid || '').toLowerCase();
          const myEmail = (user.email || '').toLowerCase();
          const isCaller =
            session.callerId?.toLowerCase() === myId ||
            session.callerId?.toLowerCase() === myEmail ||
            session.callerEmail?.toLowerCase() === myEmail;

          if (!isCaller) {
            setIncomingCall(session);
          }
        } else {
          if (incomingCallRef.current) setIncomingCall(null);
        }
      } catch (e) {}
    };

    checkIncoming();
    const interval = setInterval(checkIncoming, 1500);
    return () => clearInterval(interval);
  }, [user, isChatPage, isAudioCallOpen]);

  const handleAccept = () => {
    if (!incomingCall) return;
    setActiveCallSession(incomingCall);
    setIncomingCall(null);
    setIsAudioCallOpen(true);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    const cId = incomingCall.callId;
    declinedCallIdsRef.current.add(cId);
    setIncomingCall(null);
    try {
      await fetch('/api/chat/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signal',
          callId: cId,
          status: 'rejected',
          senderId: user?.uid,
          senderEmail: user?.email,
        })
      });
    } catch (e) {}
  };

  if (isChatPage) return null;

  return (
    <>
      <IncomingCallDialog
        isOpen={!!incomingCall}
        callerName={incomingCall?.callerName || 'Colleague'}
        callerAvatar={incomingCall?.callerAvatar}
        callerRole={incomingCall?.isGroup ? 'Group Audio' : 'Colleague'}
        callerDepartment="Shopify Catering"
        onAccept={handleAccept}
        onDecline={handleDecline}
      />

      {activeCallSession && (
        <AudioCallModal
          isOpen={isAudioCallOpen}
          onClose={() => {
            setIsAudioCallOpen(false);
            setActiveCallSession(null);
          }}
          callId={activeCallSession.callId}
          isCaller={false}
          targetName={activeCallSession.callerName || 'Colleague'}
          targetAvatar={activeCallSession.callerAvatar}
          targetRole="Colleague"
          targetDepartment="Shopify Catering"
          currentUserId={user?.uid}
          currentUserEmail={user?.email || undefined}
          currentUserName={user?.displayName || 'Member'}
          currentUserAvatar={user?.photoURL || undefined}
          initialOffer={activeCallSession.offer}
          isGroup={!!activeCallSession.isGroup}
        />
      )}
    </>
  );
}
