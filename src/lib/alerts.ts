// Simple Web Audio beep helper for tactical alerts.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function beep(kind: "granted" | "denied" | "hostile" | "info" = "info") {
  const ac = getCtx();
  if (!ac) return;
  const freq =
    kind === "granted" ? 880 : kind === "denied" ? 220 : kind === "hostile" ? 440 : 660;
  const duration = kind === "hostile" ? 0.55 : 0.18;

  const gain = ac.createGain();
  gain.gain.value = 0.0001;
  gain.connect(ac.destination);

  const osc = ac.createOscillator();
  osc.type = kind === "denied" || kind === "hostile" ? "square" : "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  const now = ac.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration + 0.02);

  if (kind === "hostile") {
    // double-pulse siren feel
    const osc2 = ac.createOscillator();
    osc2.type = "square";
    osc2.frequency.value = 660;
    osc2.connect(gain);
    osc2.start(now + 0.28);
    osc2.stop(now + 0.5);
  }
}

/**
 * Continuous two-tone lockdown siren. Returns a stop function.
 * Caller must invoke the stop function on cleanup.
 */
export function sirenLoop(): () => void {
  const ac = getCtx();
  if (!ac) return () => {};

  const gain = ac.createGain();
  gain.gain.value = 0.06;
  gain.connect(ac.destination);

  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 440;
  osc.connect(gain);

  // Alternate pitch every 600ms for a classic alarm sweep.
  const lfo = ac.createOscillator();
  lfo.type = "square";
  lfo.frequency.value = 0.9;
  const lfoGain = ac.createGain();
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  osc.start();
  lfo.start();

  return () => {
    try {
      osc.stop();
      lfo.stop();
      gain.disconnect();
    } catch {
      /* already stopped */
    }
  };
}
