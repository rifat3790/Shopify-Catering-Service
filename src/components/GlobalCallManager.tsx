'use client';

import React, { useState, useEffect } from 'react';
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

  // If user is currently on /chat, /chat already has its own dedicated handler
  const isChatPage = pathname?.startsWith('/chat');

  useEffect(() => {
    if (!user || isChatPage) {
      if (incomingCall) setIncomingCall(null);
      return;
    }

    const checkIncoming = async () => {
      if (isAudioCallOpen) return;

      try {
        const queryId = user.uid || '';
        const queryEmail = user.email || '';
        const res = await fetch(`/api/chat/call?userId=${encodeURIComponent(queryId)}&userEmail=${encodeURIComponent(queryEmail)}`);
        const json = await res.json();
        const session = json?.session;

        if (session && session.status === 'ringing') {
          const myId = (user.uid || '').toLowerCase();
          const myEmail = (user.email || '').toLowerCase();
          const isCaller = session.callerId?.toLowerCase() === myId || session.callerId?.toLowerCase() === myEmail;

          if (!isCaller) {
            setIncomingCall(session);
          }
        } else if (!session || session.status === 'ended' || session.status === 'rejected') {
          if (incomingCall) setIncomingCall(null);
        }
      } catch (e) {}
    };

    const interval = setInterval(checkIncoming, 2000);
    return () => clearInterval(interval);
  }, [user, isChatPage, isAudioCallOpen, incomingCall]);

  const handleAccept = () => {
    if (!incomingCall) return;
    setActiveCallSession(incomingCall);
    setIncomingCall(null);
    setIsAudioCallOpen(true);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    const cId = incomingCall.callId;
    setIncomingCall(null);
    try {
      await fetch('/api/chat/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signal', callId: cId, status: 'rejected' })
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
          currentUserName={user?.displayName || 'Member'}
          currentUserAvatar={user?.photoURL || undefined}
          initialOffer={activeCallSession.offer}
          isGroup={!!activeCallSession.isGroup}
        />
      )}
    </>
  );
}
