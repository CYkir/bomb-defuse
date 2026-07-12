// Tiny synth-based sound effects — no assets needed.
let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

function beep(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.15,
  when = 0,
) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

export const sounds = {
  tick: () => beep(800, 0.05, "square", 0.08),
  correct: () => {
    beep(660, 0.12, "triangle", 0.2, 0);
    beep(880, 0.16, "triangle", 0.2, 0.1);
    beep(1320, 0.25, "triangle", 0.2, 0.22);
  },
  wrong: () => {
    beep(220, 0.2, "sawtooth", 0.25, 0);
    beep(160, 0.3, "sawtooth", 0.25, 0.15);
  },
  alarm: () => {
    beep(900, 0.15, "square", 0.18, 0);
    beep(600, 0.15, "square", 0.18, 0.18);
  },
  victory: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      beep(f, 0.25, "triangle", 0.22, i * 0.15),
    );
  },
  explode: () => {
    beep(80, 0.8, "sawtooth", 0.35, 0);
    beep(50, 1.2, "sawtooth", 0.3, 0.05);
    beep(30, 1.4, "square", 0.25, 0.1);
  },
  countdown: () => beep(1000, 0.1, "square", 0.15),
  go: () => {
    beep(1200, 0.2, "square", 0.2, 0);
    beep(1600, 0.3, "square", 0.2, 0.1);
  },
};
