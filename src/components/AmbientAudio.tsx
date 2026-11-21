// ─── AmbientAudio — subtle dark ambient drone toggle ───
// Uses Web Audio API (oscillator + low-pass filter, very quiet ~40-60Hz)

import { useState, useRef, useCallback, useEffect } from "react";
import { IconSpeaker, IconSpeakerMuted } from "~/components/icons";

export default function AmbientAudio() {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const startedRef = useRef(false);

  const stopDrone = useCallback(() => {
    try {
      oscRef.current?.stop();
    } catch {}
    oscRef.current = null;
    gainRef.current = null;
    filterRef.current = null;
  }, []);

  const startDrone = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(55, ctx.currentTime); // low A rumble
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2); // fade in

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscRef.current = osc;
      gainRef.current = gain;
      filterRef.current = filter;
      startedRef.current = true;
    } catch {
      // Web Audio not available
    }
  }, []);

  const toggle = useCallback(() => {
    if (playing) {
      stopDrone();
      setPlaying(false);
    } else {
      startDrone();
      setPlaying(true);
    }
  }, [playing, startDrone, stopDrone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopDrone();
  }, [stopDrone]);

  if (!startedRef.current && !playing) {
    return (
      <button
        onClick={toggle}
        className="touch-target fixed bottom-20 right-4 z-[99999] flex h-10 w-10 items-center justify-center rounded-full border border-dark-600 bg-dark-800/90 text-ghost-dim/50 backdrop-blur-sm transition-all duration-200 hover:border-accent-gold/40 hover:text-accent-gold active:scale-90 sm:bottom-4"
        aria-label="Enable ambient audio"
        title="Enable ambient audio"
      >
        <IconSpeakerMuted size={16} />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`touch-target fixed bottom-20 right-4 z-[99999] flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition-all duration-200 active:scale-90 sm:bottom-4 ${
        playing
          ? "border-accent-gold/40 bg-accent-gold/10 text-accent-gold shadow-[0_0_12px_rgba(201,169,110,0.2)]"
          : "border-dark-600 bg-dark-800/90 text-ghost-dim/50 hover:border-accent-gold/40 hover:text-accent-gold"
      }`}
      aria-label={playing ? "Disable ambient audio" : "Enable ambient audio"}
      title={playing ? "Disable ambient audio" : "Enable ambient audio"}
    >
      <IconSpeaker size={16} />
    </button>
  );
}
