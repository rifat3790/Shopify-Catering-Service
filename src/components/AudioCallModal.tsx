'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { playRingbackTone, playCallEndedTone } from '@/lib/callSounds';

interface AudioCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetAvatar?: string;
  targetRole?: string;
  targetDepartment?: string;
  isGroup?: boolean;
  callId?: string;
  isCaller?: boolean;
  currentUserId?: string;
  currentUserEmail?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  groupMemberIds?: string[];
  initialOffer?: any;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 4,
};

export default function AudioCallModal({
  isOpen,
  onClose,
  targetName,
  targetAvatar,
  targetRole = 'Member',
  targetDepartment = 'Shopify Team',
  isGroup = false,
  callId: propCallId,
  isCaller = true,
  currentUserId,
  currentUserEmail,
  currentUserName,
  currentUserAvatar,
  targetUserId,
  targetUserEmail,
  groupMemberIds,
  initialOffer,
}: AudioCallModalProps) {
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [activeCallId, setActiveCallId] = useState<string | null>(propCallId || null);
  const [statusMessage, setStatusMessage] = useState<string>('Connecting secure line...');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioBlocked, setAudioBlocked] = useState<boolean>(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const stopRingbackRef = useRef<(() => void) | null>(null);
  const pollingIntervalRef = useRef<any>(null);
  const disconnectGraceTimerRef = useRef<any>(null);
  const iceFlushTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<any>(null);
  const activeCallIdRef = useRef<string | null>(propCallId || null);
  const endedGuardRef = useRef<boolean>(false);
  const cancelledBeforeInitRef = useRef<boolean>(false);
  const isSpeakerOnRef = useRef<boolean>(true);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Keep activeCallIdRef synced with prop
  useEffect(() => {
    if (propCallId) {
      activeCallIdRef.current = propCallId;
      setActiveCallId(propCallId);
    }
  }, [propCallId]);

  const sendEndSignal = (targetId: string) => {
    fetch('/api/chat/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        action: 'end',
        callId: targetId,
        senderId: currentUserId || currentUserEmail,
      }),
    }).catch(() => {});
  };

  // Clean up WebRTC & audio resources
  const cleanupCall = () => {
    if (stopRingbackRef.current) {
      stopRingbackRef.current();
      stopRingbackRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (disconnectGraceTimerRef.current) {
      clearTimeout(disconnectGraceTimerRef.current);
      disconnectGraceTimerRef.current = null;
    }
    if (iceFlushTimerRef.current) {
      clearTimeout(iceFlushTimerRef.current);
      iceFlushTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
      } catch (e) {}
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.oniceconnectionstatechange = null;
        peerConnectionRef.current.close();
      } catch (e) {}
      peerConnectionRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  };

  const handleEndCall = (notifyServer = true, endLabel = 'Call Ended') => {
    if (endedGuardRef.current) return;
    endedGuardRef.current = true;
    cancelledBeforeInitRef.current = true;

    setCallStatus('ended');
    setStatusMessage(endLabel);
    playCallEndedTone();

    const targetCallId = activeCallIdRef.current || propCallId;
    if (notifyServer && targetCallId) {
      sendEndSignal(targetCallId);
    }

    cleanupCall();

    setTimeout(() => {
      onCloseRef.current();
    }, 800);
  };

  // End call automatically if user closes or reloads tab mid-call
  useEffect(() => {
    if (!isOpen) return;
    const handleBeforeUnload = () => {
      const targetCallId = activeCallIdRef.current || propCallId;
      if (targetCallId && !endedGuardRef.current && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/chat/call',
          JSON.stringify({
            action: 'end',
            callId: targetCallId,
            senderId: currentUserId || currentUserEmail,
          })
        );
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [isOpen, propCallId, currentUserId, currentUserEmail]);

  // Main WebRTC & Call Signaling Lifecycle
  useEffect(() => {
    if (!isOpen) {
      cleanupCall();
      endedGuardRef.current = false;
      cancelledBeforeInitRef.current = false;
      activeCallIdRef.current = null;
      setActiveCallId(null);
      setCallStatus('calling');
      setSeconds(0);
      setIsMuted(false);
      setIsSpeakerOn(true);
      isSpeakerOnRef.current = true;
      setAudioBlocked(false);
      setStatusMessage('Connecting secure line...');
      return;
    }

    let isMounted = true;
    endedGuardRef.current = false;
    cancelledBeforeInitRef.current = false;

    const localIceBuffer: RTCIceCandidateInit[] = [];
    const remoteIceQueue: RTCIceCandidateInit[] = [];
    let currentCallId: string | undefined = propCallId || undefined;
    let isRemoteDescSet = false;

    if (currentCallId) {
      activeCallIdRef.current = currentCallId;
    }

    const flushLocalIceCandidates = async () => {
      if (!currentCallId || localIceBuffer.length === 0 || !isMounted) return;
      const batch = localIceBuffer.splice(0, localIceBuffer.length);
      try {
        await fetch('/api/chat/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'signal',
            callId: currentCallId,
            iceCandidates: batch,
            senderId: currentUserId,
            senderEmail: currentUserEmail,
          }),
        });
      } catch (e) {}
    };

    const scheduleLocalIceFlush = () => {
      if (iceFlushTimerRef.current) return;
      iceFlushTimerRef.current = setTimeout(() => {
        iceFlushTimerRef.current = null;
        flushLocalIceCandidates();
      }, 90);
    };

    const flushRemoteIceQueue = async (pc: RTCPeerConnection) => {
      if (!isRemoteDescSet || !pc.remoteDescription) return;
      while (remoteIceQueue.length > 0) {
        const cand = remoteIceQueue.shift();
        if (!cand) continue;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {}
      }
    };

    async function setupCall() {
      try {
        // 1. Capture microphone with echo cancellation + noise suppression (or recvonly fallback if mic unavailable)
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
        } catch (micErr) {
          console.warn('Microphone access denied or missing, switching to listen-only mode:', micErr);
        }

        if (!isMounted || cancelledBeforeInitRef.current) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        if (stream) {
          localStreamRef.current = stream;

          // Live voice input waveform visualizer
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const ctx = new AudioContextClass();
              audioContextRef.current = ctx;
              const source = ctx.createMediaStreamSource(stream);
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 64;
              source.connect(analyser);
              analyserRef.current = analyser;

              const checkAudio = () => {
                if (!analyserRef.current || !isMounted) return;
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
                animFrameRef.current = requestAnimationFrame(checkAudio);
              };
              animFrameRef.current = requestAnimationFrame(checkAudio);
            }
          } catch (e) {}
        }

        // 2. Initialize RTCPeerConnection and register ALL handlers BEFORE creating Offer/Answer
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        if (stream) {
          stream.getAudioTracks().forEach((track) => {
            pc.addTrack(track, stream!);
          });
        } else {
          pc.addTransceiver('audio', { direction: 'recvonly' });
        }

        // Attach local ICE handler BEFORE setLocalDescription so ZERO ICE candidates are dropped!
        pc.onicecandidate = (event) => {
          if (event.candidate && isMounted && !endedGuardRef.current) {
            localIceBuffer.push(event.candidate.toJSON ? event.candidate.toJSON() : event.candidate);
            if (currentCallId) {
              scheduleLocalIceFlush();
            }
          }
        };

        // Route remote voice audio cleanly into <audio> element
        pc.ontrack = (event) => {
          if (!isMounted) return;
          const remoteStream =
            (event.streams && event.streams.length > 0 && event.streams[0]) ||
            new MediaStream([event.track]);
          remoteStreamRef.current = remoteStream;

          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.volume = 1.0;
            remoteAudioRef.current.muted = !isSpeakerOnRef.current;
            const playPromise = remoteAudioRef.current.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise
                .then(() => {
                  if (isMounted) setAudioBlocked(false);
                })
                .catch(() => {
                  if (isMounted) setAudioBlocked(true);
                });
            }
          }
        };

        // Track WebRTC ICE/connection state for instant audio status and disconnect detection
        const handleStateChange = () => {
          if (!isMounted || endedGuardRef.current) return;
          const connState = pc.connectionState;
          const iceState = pc.iceConnectionState;

          if (iceState === 'connected' || iceState === 'completed' || connState === 'connected') {
            if (disconnectGraceTimerRef.current) {
              clearTimeout(disconnectGraceTimerRef.current);
              disconnectGraceTimerRef.current = null;
            }
            if (stopRingbackRef.current) {
              stopRingbackRef.current();
              stopRingbackRef.current = null;
            }
            setCallStatus('connected');
            setStatusMessage(stream ? 'Connected • HD Audio' : 'Connected • Listen Only');
          } else if (connState === 'failed' || iceState === 'failed') {
            handleEndCall(true, 'Connection Lost');
          } else if (connState === 'disconnected' || iceState === 'disconnected') {
            setStatusMessage('Reconnecting audio...');
            if (!disconnectGraceTimerRef.current) {
              disconnectGraceTimerRef.current = setTimeout(() => {
                if (
                  isMounted &&
                  !endedGuardRef.current &&
                  (pc.iceConnectionState === 'disconnected' || pc.connectionState === 'disconnected')
                ) {
                  handleEndCall(true, 'Call Ended');
                }
              }, 5000);
            }
          }
        };

        pc.onconnectionstatechange = handleStateChange;
        pc.oniceconnectionstatechange = handleStateChange;

        // 3. CALLER FLOW
        if (isCaller) {
          setStatusMessage('Ringing...');
          stopRingbackRef.current = playRingbackTone();

          const offer = await pc.createOffer({ offerToReceiveAudio: true });
          if (!isMounted || cancelledBeforeInitRef.current) return;
          await pc.setLocalDescription(offer);
          if (!isMounted || cancelledBeforeInitRef.current) return;

          if (!currentCallId && targetUserId && currentUserId) {
            try {
              const res = await fetch('/api/chat/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'initiate',
                  callerId: currentUserId,
                  callerEmail: currentUserEmail,
                  callerName: currentUserName || 'Colleague',
                  callerAvatar: currentUserAvatar,
                  receiverId: targetUserId,
                  receiverEmail: targetUserEmail,
                  receiverName: targetName,
                  receiverAvatar: targetAvatar,
                  isGroup,
                  groupMemberIds,
                  offer,
                }),
              });
              const data = await res.json();
              if (data.success && data.session) {
                currentCallId = data.session.callId;
                activeCallIdRef.current = currentCallId!;
                setActiveCallId(currentCallId!);

                // If caller pressed hangup before initiate returned, immediately cancel on server!
                if (!isMounted || cancelledBeforeInitRef.current) {
                  sendEndSignal(currentCallId!);
                  return;
                }

                // Flush all ICE candidates gathered while waiting for initiate!
                flushLocalIceCandidates();
              }
            } catch (err) {
              console.error('Call initiation error:', err);
            }
          }

          let answerHandled = false;
          let handledCandidatesCount = 0;

          pollingIntervalRef.current = setInterval(async () => {
            if (!currentCallId || !isMounted || endedGuardRef.current) return;
            try {
              const res = await fetch(
                `/api/chat/call?callId=${encodeURIComponent(currentCallId)}&userId=${encodeURIComponent(currentUserId || '')}&userEmail=${encodeURIComponent(currentUserEmail || '')}&t=${Date.now()}`,
                { cache: 'no-store' }
              );
              const data = await res.json();
              const session = data?.session;

              // If session was terminated by receiver (rejected, ended, or cleaned up) -> end for caller too!
              if (!session) {
                handleEndCall(false, 'Call Ended');
                return;
              }
              if (session.status === 'rejected') {
                handleEndCall(false, 'Call Declined');
                return;
              }
              if (session.status === 'ended') {
                handleEndCall(false, 'Call Ended');
                return;
              }

              // Handle receiver's answer
              if (session.status === 'accepted' && session.answer && !answerHandled) {
                answerHandled = true;
                if (stopRingbackRef.current) {
                  stopRingbackRef.current();
                  stopRingbackRef.current = null;
                }
                await pc.setRemoteDescription(new RTCSessionDescription(session.answer));
                isRemoteDescSet = true;
                setCallStatus('connected');
                setStatusMessage(stream ? 'Connected • HD Audio' : 'Connected • Listen Only');
                await flushRemoteIceQueue(pc);
              }

              // Queue & apply receiver ICE candidates
              if (session.receiverCandidates && session.receiverCandidates.length > handledCandidatesCount) {
                for (let i = handledCandidatesCount; i < session.receiverCandidates.length; i++) {
                  remoteIceQueue.push(session.receiverCandidates[i]);
                }
                handledCandidatesCount = session.receiverCandidates.length;
                await flushRemoteIceQueue(pc);
              }
            } catch (e) {}
          }, 700);
        } else {
          // 4. RECEIVER FLOW (Answering incoming call)
          setStatusMessage('Establishing audio...');
          let handledCandidatesCount = 0;
          let offerToUse = initialOffer;
          let fetchedSession: any = null;

          if (currentCallId) {
            try {
              const res = await fetch(
                `/api/chat/call?callId=${encodeURIComponent(currentCallId)}&userId=${encodeURIComponent(currentUserId || '')}&userEmail=${encodeURIComponent(currentUserEmail || '')}&t=${Date.now()}`,
                { cache: 'no-store' }
              );
              const data = await res.json();
              fetchedSession = data?.session;
              if (!fetchedSession || fetchedSession.status === 'ended' || fetchedSession.status === 'rejected') {
                handleEndCall(false, 'Call Cancelled');
                return;
              }
              if (!offerToUse) offerToUse = fetchedSession.offer;
              if (Array.isArray(fetchedSession.callerCandidates) && fetchedSession.callerCandidates.length > 0) {
                for (const c of fetchedSession.callerCandidates) {
                  remoteIceQueue.push(c);
                }
                handledCandidatesCount = fetchedSession.callerCandidates.length;
              }
            } catch (e) {}
          }

          if (!isMounted || endedGuardRef.current) return;

          if (offerToUse) {
            await pc.setRemoteDescription(new RTCSessionDescription(offerToUse));
            isRemoteDescSet = true;
            await flushRemoteIceQueue(pc);

            const answer = await pc.createAnswer();
            if (!isMounted || endedGuardRef.current) return;
            await pc.setLocalDescription(answer);
            if (!isMounted || endedGuardRef.current) return;

            if (currentCallId) {
              await fetch('/api/chat/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'signal',
                  callId: currentCallId,
                  status: 'accepted',
                  answer,
                  senderId: currentUserId,
                  senderEmail: currentUserEmail,
                }),
              });
              // Flush ICE candidates gathered during setLocalDescription(answer)
              flushLocalIceCandidates();
            }
            setCallStatus('connected');
            setStatusMessage(stream ? 'Connected • HD Audio' : 'Connected • Listen Only');
          }

          // Poll caller ICE candidates & hangup status
          pollingIntervalRef.current = setInterval(async () => {
            if (!currentCallId || !isMounted || endedGuardRef.current) return;
            try {
              const res = await fetch(
                `/api/chat/call?callId=${encodeURIComponent(currentCallId)}&userId=${encodeURIComponent(currentUserId || '')}&userEmail=${encodeURIComponent(currentUserEmail || '')}&t=${Date.now()}`,
                { cache: 'no-store' }
              );
              const data = await res.json();
              const session = data?.session;

              if (!session || session.status === 'ended' || session.status === 'rejected') {
                handleEndCall(false, 'Call Ended');
                return;
              }

              if (session.callerCandidates && session.callerCandidates.length > handledCandidatesCount) {
                for (let i = handledCandidatesCount; i < session.callerCandidates.length; i++) {
                  remoteIceQueue.push(session.callerCandidates[i]);
                }
                handledCandidatesCount = session.callerCandidates.length;
                await flushRemoteIceQueue(pc);
              }
            } catch (e) {}
          }, 700);
        }
      } catch (err) {
        console.error('Call setup error:', err);
        setStatusMessage('Call connection failed');
      }
    }

    setupCall();

    return () => {
      isMounted = false;
      cleanupCall();
    };
  }, [isOpen, propCallId, isCaller]);

  // Call duration timer
  useEffect(() => {
    let interval: any;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const unlockRemoteAudio = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1.0;
      remoteAudioRef.current
        .play()
        .then(() => {
          setAudioBlocked(false);
          setIsSpeakerOn(true);
          isSpeakerOnRef.current = true;
        })
        .catch(() => {});
    }
  };

  // Toggle mic mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const nextMuted = !isMuted;
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
      setIsMuted(nextMuted);
    }
    if (audioBlocked) unlockRemoteAudio();
  };

  // Toggle speaker output
  const toggleSpeaker = () => {
    const nextSpeaker = !isSpeakerOn;
    isSpeakerOnRef.current = nextSpeaker;
    setIsSpeakerOn(nextSpeaker);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !nextSpeaker;
      if (nextSpeaker) {
        remoteAudioRef.current.play().then(() => setAudioBlocked(false)).catch(() => {});
      }
    }
  };

  if (!isOpen) return null;

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Hidden audio element for remote voice playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 border border-emerald-500/40 p-7 sm:p-8 shadow-2xl text-center space-y-6 overflow-hidden">
        {/* Ambient Ringing Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/15 blur-[90px] rounded-full pointer-events-none" />

        {/* Call Security Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Shopify WebRTC HD Voice</span>
        </div>

        {/* Pulsing Avatar with Audio Waves */}
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
          {callStatus === 'connected' && (
            <>
              <div
                className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping"
                style={{ animationDuration: '2.5s' }}
              />
              <div
                className="absolute -inset-3 rounded-full border border-amber-400/30 transition-all duration-150"
                style={{ transform: `scale(${1 + audioLevel / 200})` }}
              />
            </>
          )}
          {callStatus === 'calling' && (
            <div
              className="absolute -inset-2 rounded-full border-2 border-emerald-400/40 border-t-amber-400 animate-spin"
              style={{ animationDuration: '3s' }}
            />
          )}
          <img
            src={
              targetAvatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=047857&color=fff`
            }
            alt={targetName}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-emerald-500/60 shadow-2xl relative z-10"
          />
        </div>

        {/* Member Info & Timer */}
        <div className="space-y-1">
          <h3 className="font-serif font-bold text-xl text-white tracking-wide">
            {targetName}
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            {isGroup ? 'Group Audio Channel' : `${targetRole} • ${targetDepartment}`}
          </p>

          <div className="pt-2">
            {callStatus === 'calling' && (
              <p className="text-xs text-amber-400 flex items-center justify-center gap-1.5 animate-pulse font-medium">
                <Radio className="w-3.5 h-3.5" />
                <span>{statusMessage}</span>
              </p>
            )}
            {callStatus === 'connected' && (
              <div className="space-y-1">
                <span className="font-mono text-base font-bold text-emerald-400 tracking-wider">
                  {formatTimer(seconds)}
                </span>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {statusMessage}
                </p>
              </div>
            )}
            {callStatus === 'ended' && (
              <p className="text-xs text-rose-400 font-semibold">
                {statusMessage || 'Call Ended'}
              </p>
            )}
          </div>
        </div>

        {/* Browser Autoplay Fallback Unmute Prompt */}
        {audioBlocked && callStatus === 'connected' && (
          <button
            type="button"
            onClick={unlockRemoteAudio}
            className="mx-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg animate-bounce"
          >
            <Volume2 className="w-4 h-4" />
            <span>Tap to Hear Voice Audio</span>
          </button>
        )}

        {/* Live Sound Waveform Indicator */}
        {callStatus === 'connected' && (
          <div className="flex items-center justify-center gap-1.5 h-7">
            <span
              className="w-1.5 bg-emerald-400 rounded-full transition-all duration-100"
              style={{ height: `${Math.max(6, Math.min(28, 6 + audioLevel * 0.22))}px` }}
            />
            <span
              className="w-1.5 bg-amber-400 rounded-full transition-all duration-100"
              style={{ height: `${Math.max(8, Math.min(28, 8 + audioLevel * 0.28))}px` }}
            />
            <span
              className="w-1.5 bg-emerald-300 rounded-full transition-all duration-100"
              style={{ height: `${Math.max(10, Math.min(28, 10 + audioLevel * 0.32))}px` }}
            />
            <span
              className="w-1.5 bg-amber-400 rounded-full transition-all duration-100"
              style={{ height: `${Math.max(8, Math.min(28, 8 + audioLevel * 0.28))}px` }}
            />
            <span
              className="w-1.5 bg-emerald-400 rounded-full transition-all duration-100"
              style={{ height: `${Math.max(6, Math.min(28, 6 + audioLevel * 0.22))}px` }}
            />
          </div>
        )}

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {/* Mute Button */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-3.5 rounded-full border transition-all cursor-pointer ${
              isMuted
                ? 'bg-amber-950/80 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={() => handleEndCall(true)}
            className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/60 transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="End Audio Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Speaker Button */}
          <button
            type="button"
            onClick={toggleSpeaker}
            className={`p-3.5 rounded-full border transition-all cursor-pointer ${
              !isSpeakerOn
                ? 'bg-slate-800 border-slate-700 text-slate-500'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={isSpeakerOn ? 'Mute Remote Audio' : 'Unmute Remote Audio'}
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
