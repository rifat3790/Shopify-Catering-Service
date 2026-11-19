// Web Audio API Ringtone & Sound Synthesizer (Zero external dependencies, 100% offline reliable)

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playRingbackTone(): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  let isPlaying = true;
  let currentOsc1: OscillatorNode | null = null;
  let currentOsc2: OscillatorNode | null = null;
  let currentGain: GainNode | null = null;
  let timer: any = null;

  const playBurst = () => {
    if (!isPlaying || !ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime); // Standard ringback freq A
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, ctx.currentTime); // Standard ringback freq B

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.8);
      osc2.stop(ctx.currentTime + 1.8);

      currentOsc1 = osc1;
      currentOsc2 = osc2;
      currentGain = gain;
    } catch (e) {}

    timer = setTimeout(playBurst, 4000); // 1.8s tone + 2.2s silence
  };

  playBurst();

  return () => {
    isPlaying = false;
    clearTimeout(timer);
    try {
      if (currentOsc1) currentOsc1.stop();
      if (currentOsc2) currentOsc2.stop();
      if (currentGain) currentGain.disconnect();
    } catch (e) {}
  };
}

export function playIncomingRingtone(): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  let isPlaying = true;
  let timer: any = null;

  const playChirp = () => {
    if (!isPlaying || !ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();

      // Dual tone ring
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, t); // E5
      osc1.frequency.setValueAtTime(880, t + 0.25); // A5

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, t); // C5
      osc2.frequency.setValueAtTime(698.46, t + 0.25); // F5

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.9);
      osc2.stop(t + 0.9);
    } catch (e) {}

    timer = setTimeout(playChirp, 2000);
  };

  playChirp();

  return () => {
    isPlaying = false;
    clearTimeout(timer);
  };
}

export function playCallEndedTone(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  } catch (e) {}
}
