'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldCheck,
  Radio
} from 'lucide-react';

interface AudioCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetAvatar?: string;
  targetRole?: string;
  targetDepartment?: string;
  isGroup?: boolean;
}

export default function AudioCallModal({
  isOpen,
  onClose,
  targetName,
  targetAvatar,
  targetRole = 'Member',
  targetDepartment = 'Shopify Team',
  isGroup = false,
}: AudioCallModalProps) {
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Initialize Web Audio and Microphone
  useEffect(() => {
    if (!isOpen) {
      setCallStatus('calling');
      setSeconds(0);
      return;
    }

    let isMounted = true;

    // Start user audio stream
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          if (isMounted) {
            mediaStreamRef.current = stream;
          } else {
            stream.getTracks().forEach(t => t.stop());
          }
        })
        .catch((err) => {
          console.warn('Microphone access note:', err.message);
        });
    }

    // Connect after 2.5 seconds ringing simulation
    const connectTimer = setTimeout(() => {
      if (isMounted) {
        setCallStatus('connected');
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(connectTimer);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [isOpen]);

  // Call timer tick
  useEffect(() => {
    let interval: any;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Toggle mute
  const toggleMute = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setTimeout(() => {
      onClose();
    }, 700);
  };

  if (!isOpen) return null;

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 border border-emerald-500/40 p-8 shadow-2xl text-center space-y-6 overflow-hidden">
        
        {/* Ambient Ringing Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[90px] rounded-full pointer-events-none" />

        {/* Call Security Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Shopify Secure Voice Audio</span>
        </div>

        {/* Pulsing Avatar with Waves */}
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
          {callStatus === 'connected' && (
            <>
              <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute -inset-3 rounded-full border border-amber-400/20 animate-pulse" />
            </>
          )}
          {callStatus === 'calling' && (
            <div className="absolute -inset-2 rounded-full border-2 border-emerald-400/40 border-t-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
          )}
          <img
            src={targetAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=047857&color=fff`}
            alt={targetName}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-emerald-500/50 shadow-2xl relative z-10"
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
                <span>Ringing Secure Line...</span>
              </p>
            )}
            {callStatus === 'connected' && (
              <div className="space-y-1">
                <span className="font-mono text-base font-bold text-emerald-400 tracking-wider">
                  {formatTimer(seconds)}
                </span>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Audio Connected • HD Voice
                </p>
              </div>
            )}
            {callStatus === 'ended' && (
              <p className="text-xs text-rose-400 font-semibold">
                Call Ended
              </p>
            )}
          </div>
        </div>

        {/* Sound Waveform Visualization */}
        {callStatus === 'connected' && (
          <div className="flex items-center justify-center gap-1 h-6">
            <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3" style={{ animationDelay: '0.1s' }} />
            <span className="w-1 bg-amber-400 rounded-full animate-bounce h-5" style={{ animationDelay: '0.2s' }} />
            <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-4" style={{ animationDelay: '0.3s' }} />
            <span className="w-1 bg-emerald-300 rounded-full animate-bounce h-6" style={{ animationDelay: '0.15s' }} />
            <span className="w-1 bg-amber-400 rounded-full animate-bounce h-3" style={{ animationDelay: '0.25s' }} />
          </div>
        )}

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-full border transition-all ${
              isMuted 
                ? 'bg-amber-950/80 border-amber-500 text-amber-300' 
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/60 transition-all hover:scale-110 active:scale-95"
            title="End Audio Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Speaker Button */}
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`p-3.5 rounded-full border transition-all ${
              !isSpeakerOn 
                ? 'bg-slate-800 border-slate-700 text-slate-500' 
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

      </div>
    </div>
  );
}

