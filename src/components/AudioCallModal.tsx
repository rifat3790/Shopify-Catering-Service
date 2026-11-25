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
  PhoneCall
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
  currentUserName?: string;
  currentUserAvatar?: string;
  targetUserId?: string;
  initialOffer?: any;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
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
  currentUserName,
  currentUserAvatar,
  targetUserId,
  initialOffer
}: AudioCallModalProps) {
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [activeCallId, setActiveCallId] = useState<string | null>(propCallId || null);
  const [statusMessage, setStatusMessage] = useState<string>('Connecting secure line...');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const stopRingbackRef = useRef<(() => void) | null>(null);
  const pollingIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<any>(null);
  const callInitiatedRef = useRef(false);

  // Sync propCallId to activeCallId
  useEffect(() => {
    if (propCallId) {
      setActiveCallId(propCallId);
    }
  }, [propCallId]);

  // Main WebRTC & Call Signaling Lifecycle
  useEffect(() => {
    if (!isOpen) {
      cleanupCall();
      setCallStatus('calling');
      setSeconds(0);
      setActiveCallId(null);
      return;
    }

    let isMounted = true;

    async function setupCall() {
      try {
        // 1. Get user microphone stream
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (micErr: any) {
          console.warn('Microphone permission or hardware error:', micErr);
          setStatusMessage('Microphone access denied or unavailable');
          return;
        }

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;

        // Setup Audio Analyser for live voice visualizer
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

        // 2. Initialize RTCPeerConnection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        // Add local audio tracks to peer connection
        stream.getAudioTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Remote track handler -> route to remote audio element
        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(e => console.warn('Audio autoPlay prevented:', e));
          }
        };

        let currentCallId = propCallId;

        // 3. CALLER FLOW
        if (isCaller) {
          setStatusMessage('Ringing...');
          // Start telephone ringback sound
          stopRingbackRef.current = playRingbackTone();

          // Create WebRTC Offer
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
          });
          await pc.setLocalDescription(offer);

          // Initiate call session on server
          if (!currentCallId && targetUserId && currentUserId && !callInitiatedRef.current) {
            callInitiatedRef.current = true;
            try {
              const res = await fetch('/api/chat/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'initiate',
                  callerId: currentUserId,
                  callerName: currentUserName || 'Colleague',
                  callerAvatar: currentUserAvatar,
                  receiverId: targetUserId,
                  receiverName: targetName,
                  receiverAvatar: targetAvatar,
                  isGroup,
                  offer
                })
              });
              const data = await res.json();
              if (data.success && data.session) {
                currentCallId = data.session.callId;
                setActiveCallId(currentCallId);
              }
            } catch (err) {
              console.error('Call initiation error:', err);
            }
          }

          // Handle local ICE candidates
          pc.onicecandidate = (event) => {
            if (event.candidate && currentCallId) {
              fetch('/api/chat/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'signal',
                  callId: currentCallId,
                  iceCandidate: event.candidate,
                  senderId: currentUserId
                })
              }).catch(() => {});
            }
          };

          // Polling server for receiver's answer and ICE candidates
          let answerHandled = false;
          let handledCandidatesCount = 0;

          pollingIntervalRef.current = setInterval(async () => {
            if (!currentCallId || !isMounted) return;
            try {
              const res = await fetch(`/api/chat/call?userId=${encodeURIComponent(currentUserId || '')}`);
              const data = await res.json();
              const session = data?.session;

              if (!session || session.callId !== currentCallId) return;

              // Check if rejected or ended
              if (session.status === 'rejected') {
                setStatusMessage('Call Declined');
                handleEndCall(false);
                return;
              }
              if (session.status === 'ended') {
                setStatusMessage('Call Ended');
                handleEndCall(false);
                return;
              }

              // Check if answered
              if (session.status === 'accepted' && session.answer && !answerHandled) {
                answerHandled = true;
                if (stopRingbackRef.current) {
                  stopRingbackRef.current();
                  stopRingbackRef.current = null;
                }
                await pc.setRemoteDescription(new RTCSessionDescription(session.answer));
                setCallStatus('connected');
                setStatusMessage('Connected • HD Audio');
              }

              // Add any new receiver ICE candidates
              if (session.receiverCandidates && session.receiverCandidates.length > handledCandidatesCount) {
                for (let i = handledCandidatesCount; i < session.receiverCandidates.length; i++) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(session.receiverCandidates[i]));
                  } catch (e) {}
                }
                handledCandidatesCount = session.receiverCandidates.length;
              }
            } catch (e) {}
          }, 1200);

        } else {
          // 4. RECEIVER FLOW (Answering incoming call)
          setStatusMessage('Connecting audio stream...');
          setCallStatus('connected');

          let offerToUse = initialOffer;
          if (!offerToUse && currentCallId) {
            try {
              const res = await fetch(`/api/chat/call?userId=${encodeURIComponent(currentUserId || '')}`);
              const data = await res.json();
              offerToUse = data?.session?.offer;
            } catch (e) {}
          }

          if (offerToUse) {
            await pc.setRemoteDescription(new RTCSessionDescription(offerToUse));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Send answer back to caller
            if (currentCallId) {
              await fetch('/api/chat/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'signal',
                  callId: currentCallId,
                  status: 'accepted',
                  answer,
                  senderId: currentUserId
                })
              });
            }
          }

          // Handle local ICE candidates for receiver
          pc.onicecandidate = (event) => {
            if (event.candidate && currentCallId) {
              fetch('/api/chat/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'signal',
                  callId: currentCallId,
                  iceCandidate: event.candidate,
                  senderId: currentUserId
                })
              }).catch(() => {});
            }
          };

          // Poll for caller ICE candidates & ended status
          let handledCandidatesCount = 0;
          pollingIntervalRef.current = setInterval(async () => {
            if (!currentCallId || !isMounted) return;
            try {
              const res = await fetch(`/api/chat/call?userId=${encodeURIComponent(currentUserId || '')}`);
              const data = await res.json();
              const session = data?.session;

              if (!session || session.callId !== currentCallId) {
                // Session gone -> end call
                handleEndCall(false);
                return;
              }

              if (session.status === 'ended') {
                setStatusMessage('Call Ended');
                handleEndCall(false);
                return;
              }

              if (session.callerCandidates && session.callerCandidates.length > handledCandidatesCount) {
                for (let i = handledCandidatesCount; i < session.callerCandidates.length; i++) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(session.callerCandidates[i]));
                  } catch (e) {}
                }
                handledCandidatesCount = session.callerCandidates.length;
              }
            } catch (e) {}
          }, 1200);
        }

      } catch (err: any) {
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

  // Clean up all resources
  const cleanupCall = () => {
    callInitiatedRef.current = false;
    if (stopRingbackRef.current) {
      stopRingbackRef.current();
      stopRingbackRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
  };

  // Call duration timer
  useEffect(() => {
    let interval: any;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Toggle mic mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  // End call
  const handleEndCall = (notifyServer = true) => {
    setCallStatus('ended');
    playCallEndedTone();

    const targetCallId = activeCallId || propCallId;
    if (notifyServer && targetCallId) {
      fetch('/api/chat/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', callId: targetCallId })
      }).catch(() => {});
    }

    cleanupCall();

    setTimeout(() => {
      onClose();
    }, 800);
  };

  if (!isOpen) return null;

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      
      {/* Hidden audio element for crystal clear remote voice output */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 border border-emerald-500/40 p-8 shadow-2xl text-center space-y-6 overflow-hidden">
        
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
                style={{ transform: `scale(${1 + (audioLevel / 200)})` }}
              />
            </>
          )}
          {callStatus === 'calling' && (
            <div className="absolute -inset-2 rounded-full border-2 border-emerald-400/40 border-t-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
          )}
          <img
            src={targetAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=047857&color=fff`}
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
                  Audio Connected • WebRTC Live
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

        {/* Live Sound Waveform Indicator */}
        {callStatus === 'connected' && (
          <div className="flex items-center justify-center gap-1.5 h-7">
            <span 
              className="w-1.5 bg-emerald-400 rounded-full transition-all duration-100" 
              style={{ height: `${Math.max(6, Math.min(28, 6 + (audioLevel * 0.22)))}px` }} 
            />
            <span 
              className="w-1.5 bg-amber-400 rounded-full transition-all duration-100" 
              style={{ height: `${Math.max(8, Math.min(28, 8 + (audioLevel * 0.28)))}px` }} 
            />
            <span 
              className="w-1.5 bg-emerald-300 rounded-full transition-all duration-100" 
              style={{ height: `${Math.max(10, Math.min(28, 10 + (audioLevel * 0.32)))}px` }} 
            />
            <span 
              className="w-1.5 bg-amber-400 rounded-full transition-all duration-100" 
              style={{ height: `${Math.max(8, Math.min(28, 8 + (audioLevel * 0.28)))}px` }} 
            />
            <span 
              className="w-1.5 bg-emerald-400 rounded-full transition-all duration-100" 
              style={{ height: `${Math.max(6, Math.min(28, 6 + (audioLevel * 0.22)))}px` }} 
            />
          </div>
        )}

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {/* Mute Button */}
          <button
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
            onClick={() => handleEndCall(true)}
            className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/60 transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="End Audio Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Speaker Button */}
          <button
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
