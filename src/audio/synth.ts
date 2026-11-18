// Every sound in the village is synthesised here and in instruments.ts, in
// the browser: no audio files, no external services. Each buffer is rendered
// once (OfflineAudioContext, off the main thread) and afterwards only played.
// The music and the musical cues are written out in music.ts.
import { ensemble, filter, grains, noise, offline, rnd, type Note } from "./instruments";
import {
  CHIME_SHAPES,
  LIGHT_VOICINGS,
  VILLAGE_LOOP,
  chimeCue,
  finaleCue,
  giftCue,
  lightCue,
  postcardCue,
  villageTheme,
} from "./music";

export type SoundName =
  | "music"
  | "bells"
  | "step"
  | "stepWood"
  | "rustle"
  | "twinkle"
  | "place"
  | "light"
  | "paper"
  | "postcard"
  | "finale"
  | "chime";
/** Each sound may have a few variations; playback picks one. */
export type Bank = Partial<Record<SoundName, AudioBuffer[]>>;

const SFX_RATE = 32000;
const MUSIC_RATE = 22050; // the band stays warm: nothing it plays needs more

/** Render a mono foley sound, normalise it and end it on silence. */
async function render(
  seconds: number,
  rate: number,
  build: (c: OfflineAudioContext, out: AudioNode) => void,
): Promise<AudioBuffer> {
  const c = offline(seconds, rate);
  const out = c.createGain();
  out.connect(c.destination);
  build(c, out);
  const buf = await c.startRendering();
  const d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]!));
  const k = peak > 0 ? 0.9 / peak : 1;
  const fade = Math.min(d.length, Math.floor(0.05 * buf.sampleRate));
  for (let i = 0; i < d.length; i++) d[i]! *= k * Math.min(1, (d.length - 1 - i) / fade);
  return buf;
}

// ---------------------------------------------------------------- foley

/** Boots in fresh snow: a cluster of tiny crunches over a soft, low press. */
function step(): Promise<AudioBuffer> {
  return render(0.26, SFX_RATE, (c, out) => {
    const ev: number[][] = [];
    const n = 34 + Math.floor(Math.random() * 18);
    for (let i = 0; i < n; i++) {
      const t = 0.01 + Math.random() ** 1.7 * 0.15;
      ev.push([t, rnd(0.3, 1) * (1 - t / 0.18), rnd(0.0004, 0.0025)]);
    }
    noise(c, out, grains(c, 0.26, ev), [
      filter(c, "highpass", 380),
      filter(c, "peaking", rnd(1600, 2300), 1.1, 5),
      filter(c, "lowpass", 5200),
    ]);
    noise(c, out, grains(c, 0.26, [[0.004, 1, 0.08]]), [filter(c, "lowpass", 240)], 0.55);
  });
}

function stepWood(): Promise<AudioBuffer> {
  return render(0.3, SFX_RATE, (c, out) => {
    const o = c.createOscillator();
    o.frequency.setValueAtTime(rnd(160, 190), 0);
    o.frequency.exponentialRampToValueAtTime(115, 0.09);
    const g = c.createGain();
    g.gain.setValueAtTime(0, 0);
    g.gain.linearRampToValueAtTime(0.7, 0.003);
    g.gain.setTargetAtTime(0, 0.003, 0.035);
    o.connect(g).connect(out);
    o.start(0);
    o.stop(0.3);
    noise(
      c,
      out,
      grains(c, 0.3, [[0, 1, 0.025]]),
      [filter(c, "bandpass", 900, 1.2), filter(c, "lowpass", 2400)],
      0.6,
    );
  });
}

/** Paper crinkles: clusters of clicks over a faint swish. */
function crinkle(seconds: number, clusters: number, tone: number, swish: number): number[][] {
  const ev: number[][] = [];
  for (let k = 0; k < clusters; k++) {
    const tc = 0.02 + (k / clusters) * seconds * 0.75 + rnd(0, 0.04);
    const strength = rnd(0.4, 1) * (1 - (k / clusters) * 0.5);
    for (let m = 0, n = 5 + Math.floor(Math.random() * 10); m < n; m++)
      ev.push([tc + rnd(0, 0.05), strength * rnd(0.3, 1) * tone, rnd(0.0002, 0.0013)]);
  }
  for (let t = 0.01; t < seconds * 0.85; t += 0.006)
    ev.push([t, swish * Math.sin((Math.PI * t) / (seconds * 0.85)), 0.012]);
  return ev;
}

function rustle(): Promise<AudioBuffer> {
  return render(0.75, SFX_RATE, (c, out) =>
    noise(c, out, grains(c, 0.75, crinkle(0.62, 7, 1, 0.08)), [
      filter(c, "highpass", 1500),
      filter(c, "peaking", 4200, 1, 4),
      filter(c, "lowpass", 10000),
    ]),
  );
}

/** A folded note opening: softer crinkles and one slow, airy flap. */
function paper(): Promise<AudioBuffer> {
  return render(1.1, SFX_RATE, (c, out) => {
    noise(c, out, grains(c, 1.1, crinkle(0.9, 5, 0.7, 0.05)), [
      filter(c, "highpass", 1100),
      filter(c, "peaking", 3200, 1, 3),
      filter(c, "lowpass", 8000),
    ]);
    noise(
      c,
      out,
      grains(c, 1.1, [[0.45, 1, 0.42]]),
      [filter(c, "bandpass", 650, 0.6), filter(c, "lowpass", 1400)],
      0.9,
    );
  });
}

/** A present settling into snow: a muffled press with a little crunch. */
function place(): Promise<AudioBuffer> {
  return render(0.5, SFX_RATE, (c, out) => {
    const o = c.createOscillator();
    o.frequency.setValueAtTime(96, 0);
    o.frequency.exponentialRampToValueAtTime(58, 0.14);
    const g = c.createGain();
    g.gain.setValueAtTime(0, 0);
    g.gain.linearRampToValueAtTime(0.75, 0.004);
    g.gain.setTargetAtTime(0, 0.004, 0.05);
    o.connect(g).connect(out);
    o.start(0);
    o.stop(0.5);
    noise(c, out, grains(c, 0.5, [[0, 1, 0.1]]), [filter(c, "lowpass", 380)], 0.8);
    const ev: number[][] = [];
    for (let i = 0; i < 16; i++) ev.push([0.01 + Math.random() * 0.08, rnd(0.1, 0.3), 0.001]);
    noise(c, out, grains(c, 0.5, ev), [filter(c, "highpass", 500), filter(c, "lowpass", 3500)]);
  });
}

/** A trotting loop of harness bells; the game fades it with the sleigh's speed. */
function bells(): Promise<AudioBuffer> {
  const accent = [1, 0.3, 0.55, 0.3, 0.85, 0.3, 0.6, 0.4];
  const notes: Note[] = Array.from({ length: 16 }, (_, i) => ({
    i: "bells" as const,
    m: i % 4,
    t: 0.01 + i * 0.2 + rnd(0, 0.01),
    d: 0.2,
    v: Math.max(0.15, accent[i % 8]! + rnd(-0.1, 0.1)),
    p: rnd(-0.3, 0.3),
  }));
  return ensemble(notes, { rate: SFX_RATE, loop: 3.2, room: 0.12, peak: 0.7 });
}

const cue = (notes: Note[]) => ensemble(notes, { rate: SFX_RATE, room: 0.25 });
const times = <T>(n: number, f: () => Promise<T>) => Promise.all(Array.from({ length: n }, f));

/**
 * Render everything, most urgent first, handing each sound over as soon as it
 * exists. One sound failing never keeps the others from playing.
 */
export async function renderBank(onReady: (name: SoundName, v: AudioBuffer[]) => void) {
  const jobs: Array<[SoundName, () => Promise<AudioBuffer[]>]> = [
    ["step", () => times(4, step)],
    ["stepWood", () => times(2, stepWood)],
    ["place", () => times(2, place)],
    ["light", () => Promise.all(LIGHT_VOICINGS.map((v) => cue(lightCue(v))))],
    ["bells", () => times(1, bells)],
    ["rustle", () => times(2, rustle)],
    ["twinkle", () => times(1, () => cue(giftCue()))],
    ["paper", () => times(1, paper)],
    [
      "music",
      () =>
        times(1, () =>
          ensemble(villageTheme(), { rate: MUSIC_RATE, loop: VILLAGE_LOOP, room: 0.22 }),
        ),
    ],
    ["postcard", () => times(1, () => cue(postcardCue()))],
    ["finale", () => times(1, () => cue(finaleCue()))],
    ["chime", () => Promise.all(CHIME_SHAPES.map((s) => cue(chimeCue(s))))],
  ];
  for (const [name, job] of jobs) {
    try {
      onReady(name, await job());
    } catch (e) {
      console.warn("Sound could not be rendered: " + name, e); // the rest still play
    }
  }
}
