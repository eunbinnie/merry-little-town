// Every sound in the village is synthesised here, in the browser: no audio
// files, no external services. Each buffer is rendered once with an
// OfflineAudioContext (off the main thread) and afterwards only played back.
//
// Music: an original music-box arrangement of "Silent Night" (melody by Franz
// Xaver Gruber, 1818, public domain). The finale quotes the opening of "Joy to
// the World" (Lowell Mason, 1839, public domain). Arrangements are our own.

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
  | "chapel";
/** Each sound may have a few variations; playback picks one. */
export type Bank = Partial<Record<SoundName, AudioBuffer[]>>;

const SFX_RATE = 32000;
const MUSIC_RATE = 24000; // the music box has nothing above ~8 kHz
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function offline(seconds: number, rate: number): OfflineAudioContext {
  const length = Math.ceil(seconds * rate);
  try {
    return new OfflineAudioContext(1, length, rate);
  } catch {
    return new OfflineAudioContext(1, Math.ceil(seconds * 44100), 44100);
  }
}

/** Dark, softly decaying noise: a snowy night's reverb. */
function impulse(c: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const sr = c.sampleRate;
  const buf = c.createBuffer(1, Math.floor(seconds * sr), sr);
  const d = buf.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    lp += 0.3 * (Math.random() * 2 - 1 - lp);
    d[i] = lp * Math.exp(-t / decay) * Math.min(1, t / 0.015);
  }
  return buf;
}

type Opts = { reverb?: number; decay?: number; loop?: number; peak?: number; lowpass?: number };

/** Render `build` into a mono buffer, add reverb, normalise, fold a loop's tail. */
async function render(
  seconds: number,
  rate: number,
  build: (c: OfflineAudioContext, out: AudioNode) => void,
  o: Opts = {},
): Promise<AudioBuffer> {
  const c = offline(seconds, rate);
  const dry = c.createGain();
  let out: AudioNode = dry;
  if (o.lowpass) {
    const lp = filter(c, "lowpass", o.lowpass);
    dry.connect(lp);
    out = lp;
  }
  out.connect(c.destination);
  if (o.reverb) {
    const conv = c.createConvolver();
    conv.normalize = true;
    conv.buffer = impulse(c, (o.decay ?? 0.8) * 4, o.decay ?? 0.8);
    const wet = c.createGain();
    wet.gain.value = o.reverb;
    out.connect(conv).connect(wet).connect(c.destination);
  }
  build(c, dry);
  const buf = await c.startRendering();
  const d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]!));
  if (peak > 0) {
    const k = (o.peak ?? 0.9) / peak;
    for (let i = 0; i < d.length; i++) d[i]! *= k;
  }
  if (!o.loop) {
    // end on silence, never on a click
    const fade = Math.min(d.length, Math.floor(0.05 * buf.sampleRate));
    for (let i = 0; i < fade; i++) d[d.length - 1 - i]! *= i / fade;
    return buf;
  }
  // seamless loop: the reverb tail past the end rings on over the beginning
  const len = Math.round(o.loop * buf.sampleRate);
  const looped = new AudioBuffer({ length: len, sampleRate: buf.sampleRate, numberOfChannels: 1 });
  const l = looped.getChannelData(0);
  l.set(d.subarray(0, len));
  for (let i = len; i < d.length; i++) l[i % len]! += d[i]!;
  return looped;
}

function filter(
  c: BaseAudioContext,
  type: BiquadFilterType,
  frequency: number,
  Q = 0.7,
  gain = 0,
): BiquadFilterNode {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = Q;
  f.gain.value = gain;
  return f;
}

/** Short windowed noise bursts at [time, amplitude, duration]: crunches, crinkles, knocks. */
function grains(c: BaseAudioContext, seconds: number, events: number[][]): AudioBuffer {
  const sr = c.sampleRate;
  const buf = c.createBuffer(1, Math.ceil(seconds * sr), sr);
  const d = buf.getChannelData(0);
  for (const [t, a, dur] of events) {
    const s = Math.floor(t! * sr);
    const n = Math.max(2, Math.floor(dur! * sr));
    for (let i = 0; i < n && s + i < d.length; i++)
      d[s + i]! += (Math.random() * 2 - 1) * a! * Math.sin((Math.PI * i) / n);
  }
  return buf;
}

function noise(
  c: BaseAudioContext,
  out: AudioNode,
  buf: AudioBuffer,
  filters: BiquadFilterNode[],
  level = 1,
  at = 0,
): void {
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = level;
  let node: AudioNode = src;
  for (const f of filters) node = node.connect(f);
  node.connect(g).connect(out);
  src.start(at);
}

/**
 * One music-box tine: a slightly detuned pair (the slow shimmer of a real
 * comb), soft upper partials and an inharmonic "ping" that dies quickly.
 */
function tine(c: BaseAudioContext, out: AudioNode, t: number, midi: number, v: number): void {
  const f = hz(midi);
  const k = Math.sqrt(523 / f); // low tines ring longer
  const parts: Array<[number, number, number]> = [
    [1, 1, 2.4 * k],
    [1.0019, 0.32, 2.1 * k],
    [2, 0.14, 0.9 * k],
    [3, 0.04, 0.45 * k],
    [4.21, 0.08, 0.22],
    [5.43, 0.03, 0.12],
  ];
  for (const [ratio, amp, decay] of parts) {
    if (f * ratio > c.sampleRate * 0.42) continue;
    const o = c.createOscillator();
    o.frequency.value = f * ratio;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp * v, t + 0.004);
    g.gain.setTargetAtTime(0, t + 0.004, decay / 4.6);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + decay + 0.05);
  }
}

// ---------------------------------------------------------------- music

const EIGHTH = 0.42;
/** Silent Night, an octave up (C5 = 72), in eighth notes of 3/4. */
const MELODY: ReadonlyArray<readonly [number, number]> = [
  [79, 3], [81, 1], [79, 2], [76, 6],
  [79, 3], [81, 1], [79, 2], [76, 6],
  [86, 4], [86, 2], [83, 6],
  [84, 4], [84, 2], [79, 6],
  [81, 4], [81, 2], [84, 3], [83, 1], [81, 2], [79, 3], [81, 1], [79, 2], [76, 6],
  [81, 4], [81, 2], [84, 3], [83, 1], [81, 2], [79, 3], [81, 1], [79, 2], [76, 6],
  [86, 4], [86, 2], [89, 3], [86, 1], [83, 2], [84, 6], [88, 6],
  [84, 3], [79, 1], [76, 2], [79, 3], [77, 1], [74, 2], [72, 12],
]; // prettier-ignore
const CHORDS = "CCCCGGCCFFCCFFCCGGCCCGCC";
/** Root, fifth, tenth: a gentle waltz under the melody. */
const VOICING: Record<string, readonly [number, number, number]> = {
  C: [48, 55, 64],
  F: [53, 60, 69],
  G: [55, 62, 65],
};

function music(): Promise<AudioBuffer> {
  const loop = 144 * EIGHTH;
  return render(
    loop + 4,
    MUSIC_RATE,
    (c, out) => {
      const human = () => rnd(-0.006, 0.006);
      let t = 0.04;
      for (const [note, len] of MELODY) {
        const downbeat = Math.round((t - 0.04) / EIGHTH) % 6 === 0;
        tine(c, out, t + human(), note, (downbeat ? 0.78 : 0.68) * rnd(0.92, 1.05));
        t += len * EIGHTH;
      }
      [...CHORDS].forEach((name, bar) => {
        const [root, fifth, tenth] = VOICING[name]!;
        const b = 0.04 + bar * 6 * EIGHTH;
        tine(c, out, b + human(), root, 0.4 * rnd(0.9, 1.05));
        tine(c, out, b + 2 * EIGHTH + human(), fifth, 0.26 * rnd(0.9, 1.05));
        tine(c, out, b + 4 * EIGHTH + human(), tenth, 0.24 * rnd(0.9, 1.05));
      });
    },
    { reverb: 0.4, decay: 0.75, loop, peak: 0.8, lowpass: 5200 },
  );
}

function phrase(
  seconds: number,
  notes: ReadonlyArray<readonly [number, number, number]>,
  extra?: (c: OfflineAudioContext, out: AudioNode) => void,
): Promise<AudioBuffer> {
  return render(
    seconds,
    SFX_RATE,
    (c, out) => {
      for (const [t, n, v] of notes) tine(c, out, t, n, v);
      extra?.(c, out);
    },
    { reverb: 0.45, decay: 0.7, peak: 0.85, lowpass: 7000 },
  );
}

/** A window lights up: a rising arpeggio over a warm dyad, three voicings. */
const LIGHT: ReadonlyArray<readonly number[]> = [
  [72, 76, 79, 84, 88],
  [76, 79, 84, 88, 91],
  [79, 84, 88, 91, 96],
];
const light = (arp: readonly number[]) =>
  phrase(3.4, [
    [0, 60, 0.32],
    [0, 67, 0.26],
    ...arp.map((n, i) => [0.03 + i * 0.11, n, 0.62 + i * 0.04] as const),
    [0.62, arp[arp.length - 1]! + 12, 0.16],
    [0.74, arp[arp.length - 2]! + 12, 0.12],
  ]);

const POSTCARD: ReadonlyArray<readonly [number, number, number]> = [
  [0, 48, 0.36],
  [0, 64, 0.26],
  [0, 79, 0.6],
  [0.17, 84, 0.62],
  [0.34, 88, 0.66],
  [0.54, 91, 0.7],
  [0.9, 53, 0.3],
  [0.9, 89, 0.55],
  [1.08, 86, 0.52],
  [1.26, 55, 0.3],
  [1.26, 83, 0.52],
  [1.56, 48, 0.38],
  [1.56, 64, 0.3],
  [1.56, 72, 0.32],
  [1.56, 84, 0.72],
];

/** "Joy to the World", opening line, with a waltzing bass and bells. */
function finale(): Promise<AudioBuffer> {
  const q = 0.42;
  const tune: Array<[number, number]> = [
    [84, 1], [83, 0.75], [81, 0.25], [79, 1.5], [77, 0.5], [76, 1], [74, 1], [72, 2],
    [79, 0.5], [81, 1.5], [81, 0.5], [83, 1.5], [83, 0.5], [84, 2.5],
  ]; // prettier-ignore
  const notes: Array<[number, number, number]> = [];
  let beat = 0;
  for (const [n, len] of tune) {
    notes.push([0.05 + beat * q, n, 0.7]);
    beat += len;
  }
  const chord = (b: number, ns: number[], v = 0.28) =>
    ns.forEach((n) => notes.push([0.05 + b * q, n, v]));
  chord(0, [48, 64]);
  chord(2, [52, 67]);
  chord(4, [55, 65]);
  chord(6, [48, 64, 67]);
  chord(8, [55, 62]);
  chord(8.5, [53, 69], 0.24);
  chord(10.5, [55, 65], 0.24);
  chord(12.5, [48, 64, 67, 72], 0.32);
  chord(12.5, [96, 100], 0.12);
  return phrase(0.05 + 15 * q + 3.4, notes, (c, out) => {
    jingle(c, out, 0.02, 0.5);
    jingle(c, out, 0.05 + 12.5 * q, 0.6);
  });
}

// ---------------------------------------------------------------- bells

/** One shake of the harness bells: a few small bells and their rattle. */
function jingle(c: BaseAudioContext, out: AudioNode, t: number, intensity: number): void {
  const hits = 2 + Math.round(intensity * 5);
  for (let h = 0; h < hits; h++) {
    const th = t + Math.random() * 0.045;
    const f = rnd(2300, 3900);
    const v = rnd(0.2, 0.55) * intensity;
    for (const [ratio, amp, decay] of [
      [1, 1, 0.16],
      [1.51, 0.5, 0.11],
      [2.24, 0.3, 0.07],
      [3.08, 0.16, 0.05],
    ] as const) {
      if (f * ratio > c.sampleRate * 0.42) continue;
      const o = c.createOscillator();
      o.frequency.value = f * ratio;
      const g = c.createGain();
      g.gain.setValueAtTime(0, th);
      g.gain.linearRampToValueAtTime(amp * v, th + 0.0015);
      g.gain.setTargetAtTime(0, th + 0.0015, decay / 4.6);
      o.connect(g).connect(out);
      o.start(th);
      o.stop(th + decay + 0.03);
    }
  }
  noise(
    c,
    out,
    grains(c, 0.06, [[0, 1, 0.035]]),
    [filter(c, "bandpass", 6200, 1.3)],
    0.16 * intensity,
    t,
  );
}

/** A trotting loop of harness bells; the game fades it with the sleigh's speed. */
function bells(): Promise<AudioBuffer> {
  const loop = 3.2;
  const accent = [1, 0.3, 0.55, 0.3, 0.85, 0.3, 0.6, 0.4];
  return render(
    loop + 0.6,
    SFX_RATE,
    (c, out) => {
      for (let i = 0; i < 16; i++)
        jingle(
          c,
          out,
          0.01 + i * 0.2 + rnd(-0.008, 0.008),
          Math.max(0.15, accent[i % 8]! + rnd(-0.1, 0.1)),
        );
    },
    { reverb: 0.2, decay: 0.4, loop, peak: 0.7, lowpass: 8500 },
  );
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

/** Far away, the chapel bell (C, with its hum an octave below). */
function chapel(): Promise<AudioBuffer> {
  return render(
    7,
    SFX_RATE,
    (c, out) => {
      const f = 261.6;
      for (const [ratio, amp, decay] of [
        [0.5, 0.4, 5],
        [1, 0.5, 3.6],
        [1.19, 0.28, 2.6],
        [1.5, 0.2, 2.2],
        [2, 0.32, 2],
        [2.51, 0.1, 1.3],
        [2.66, 0.1, 1.1],
        [3.01, 0.07, 0.9],
      ] as const) {
        const o = c.createOscillator();
        o.frequency.value = f * ratio;
        const g = c.createGain();
        g.gain.setValueAtTime(0, 0);
        g.gain.linearRampToValueAtTime(amp, 0.006);
        g.gain.setTargetAtTime(0, 0.006, decay / 4.6);
        o.connect(g).connect(out);
        o.start(0);
        o.stop(decay + 0.1);
      }
    },
    { reverb: 0.9, decay: 1.1, peak: 0.6, lowpass: 1300 },
  );
}

const twinkle = () =>
  phrase(1.8, [
    [0, 96, 0.4],
    [0.07, 100, 0.34],
    [0.14, 103, 0.28],
    [0.21, 108, 0.18],
  ]);

const times = <T>(n: number, f: () => Promise<T>) => Promise.all(Array.from({ length: n }, f));

/**
 * Render everything, most urgent first, handing each sound over as soon as it
 * exists. Rendering runs on the audio thread; the page stays responsive.
 */
export async function renderBank(onReady: (name: SoundName, v: AudioBuffer[]) => void) {
  const jobs: Array<[SoundName, () => Promise<AudioBuffer[]>]> = [
    ["step", () => times(4, step)],
    ["stepWood", () => times(2, stepWood)],
    ["place", () => times(2, place)],
    ["light", () => Promise.all(LIGHT.map(light))],
    ["bells", () => times(1, bells)],
    ["rustle", () => times(2, rustle)],
    ["twinkle", () => times(1, twinkle)],
    ["paper", () => times(1, paper)],
    ["music", () => times(1, music)],
    ["postcard", () => times(1, () => phrase(4.4, POSTCARD))],
    ["finale", () => times(1, finale)],
    ["chapel", () => times(1, chapel)],
  ];
  for (const [name, job] of jobs) {
    try {
      onReady(name, await job());
    } catch (e) {
      console.warn(`Sound "${name}" could not be rendered.`, e); // the rest still play
    }
  }
}
