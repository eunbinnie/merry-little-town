// A small synthesised village band. Every instrument is a tiny Web Audio graph
// with its own partials, envelope, filtering and articulation. A piece is
// rendered by playing each distinct note once in an OfflineAudioContext, then
// placing copies of those notes on the timeline in plain JS (with pan and
// velocity), and finally running one short, bright room over the mix. That
// keeps hundreds of notes cheap enough for a phone.

export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);

let rateOk: Record<number, boolean> = {};
/** Offline contexts at our preferred rate, or 44.1 kHz where a browser refuses it. */
export function offline(seconds: number, rate: number, channels = 1): OfflineAudioContext {
  if (rateOk[rate] !== false)
    try {
      const c = new OfflineAudioContext(channels, Math.max(1, Math.ceil(seconds * rate)), rate);
      rateOk[rate] = true;
      return c;
    } catch {
      rateOk = { ...rateOk, [rate]: false };
    }
  return new OfflineAudioContext(channels, Math.max(1, Math.ceil(seconds * 44100)), 44100);
}

/** Decaying noise for reverb; `bright` near 1 keeps the highs of a small wooden room. */
export function impulse(
  c: BaseAudioContext,
  seconds: number,
  decay: number,
  channels = 1,
  bright = 0.3,
): AudioBuffer {
  const sr = c.sampleRate;
  const buf = c.createBuffer(channels, Math.floor(seconds * sr), sr);
  for (let ch = 0; ch < channels; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += bright * (Math.random() * 2 - 1 - lp);
      d[i] = lp * Math.exp(-t / decay) * Math.min(1, t / 0.008);
    }
  }
  return buf;
}

export function filter(
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
export function grains(c: BaseAudioContext, seconds: number, events: number[][]): AudioBuffer {
  const sr = c.sampleRate;
  const buf = c.createBuffer(1, Math.max(1, Math.ceil(seconds * sr)), sr);
  const d = buf.getChannelData(0);
  for (const [t, a, dur] of events) {
    const s = Math.floor(t! * sr);
    const n = Math.max(2, Math.floor(dur! * sr));
    for (let i = 0; i < n && s + i < d.length; i++)
      d[s + i]! += (Math.random() * 2 - 1) * a! * Math.sin((Math.PI * i) / n);
  }
  return buf;
}

export function noise(
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

/** Struck partials: [frequency ratio, amplitude, seconds to fade out]. */
function partials(
  c: BaseAudioContext,
  out: AudioNode,
  t: number,
  f: number,
  v: number,
  list: ReadonlyArray<readonly [number, number, number]>,
  attack: number,
): void {
  for (const [ratio, amp, decay] of list) {
    if (f * ratio > c.sampleRate * 0.45) continue;
    const o = c.createOscillator();
    o.frequency.value = f * ratio;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp * v, t + attack);
    g.gain.setTargetAtTime(0, t + attack, decay / 4.6);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }
}

/** A gentle vibrato that only arrives once the note has settled. */
function vibrato(
  c: BaseAudioContext,
  t: number,
  rate: number,
  depth: number,
  params: AudioParam[],
) {
  const lfo = c.createOscillator();
  lfo.frequency.value = rate;
  const amt = c.createGain();
  amt.gain.setValueAtTime(0, t);
  amt.gain.linearRampToValueAtTime(depth, t + 0.45);
  lfo.connect(amt);
  for (const p of params) amt.connect(p);
  lfo.start(t);
  return lfo;
}

type Voice = {
  /** Struck/plucked notes ring for `tail`; sustained ones hold `dur`, then release over `tail`. */
  sustained: boolean;
  tail: number;
  play(c: BaseAudioContext, out: AudioNode, t: number, midi: number, dur: number, v: number): void;
};

/** Soft wooden bars: a round fundamental, the tuned overtone two octaves up, a felt knock. */
const marimba: Voice = {
  sustained: false,
  tail: 1.5,
  play(c, out, t, midi, _dur, v) {
    const f = hz(midi);
    const k = Math.min(1.4, Math.sqrt(523 / f));
    const lp = filter(c, "lowpass", 4200);
    lp.connect(out);
    partials(
      c,
      lp,
      t,
      f,
      v,
      [
        [1, 1, 1.1 * k],
        [3.93, 0.2, 0.22 * k],
        [9.2, 0.04, 0.05],
      ],
      0.002,
    );
    noise(
      c,
      lp,
      grains(c, 0.03, [[0, 1, 0.012]]),
      [filter(c, "bandpass", Math.min(f * 2, 3200), 1.4)],
      0.07 * v,
      t,
    );
  },
};

/** Celesta: warm, mostly harmonic bell tones that bloom and fade. */
const celesta: Voice = {
  sustained: false,
  tail: 2,
  play(c, out, t, midi, _dur, v) {
    const f = hz(midi);
    const k = Math.min(1.3, Math.sqrt(784 / f));
    const lp = filter(c, "lowpass", 6000);
    lp.connect(out);
    partials(
      c,
      lp,
      t,
      f,
      v,
      [
        [1, 1, 1.7 * k],
        [2, 0.3, 0.7 * k],
        [3, 0.06, 0.3 * k],
        [4.02, 0.03, 0.14],
      ],
      0.003,
    );
  },
};

/** Glockenspiel: brighter and shorter, used only for accents. */
const glock: Voice = {
  sustained: false,
  tail: 1.6,
  play(c, out, t, midi, _dur, v) {
    const f = hz(midi);
    const k = Math.min(1.2, Math.sqrt(1047 / f));
    const lp = filter(c, "lowpass", 7500);
    lp.connect(out);
    partials(
      c,
      lp,
      t,
      f,
      v,
      [
        [1, 1, 1.3 * k],
        [2.76, 0.14, 0.32],
        [5.4, 0.04, 0.1],
      ],
      0.0015,
    );
  },
};

/** Pizzicato strings: a bright pluck whose filter closes almost at once. */
const pizz: Voice = {
  sustained: false,
  tail: 0.7,
  play(c, out, t, midi, _dur, v) {
    const f = hz(midi);
    const k = Math.min(1.5, Math.sqrt(262 / f));
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 1.1;
    lp.frequency.setValueAtTime(Math.min(f * 7, 4200), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.6, 320), t + 0.16);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1.4 * v, t + 0.004);
    g.gain.setTargetAtTime(0, t + 0.004, 0.13 * k);
    for (const [type, ratio, amp] of [
      ["sawtooth", 1, 0.7],
      ["triangle", 2, 0.3],
    ] as const) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f * ratio;
      const a = c.createGain();
      a.gain.value = amp;
      o.connect(a).connect(lp);
      o.start(t);
      o.stop(t + 0.7);
    }
    lp.connect(g).connect(out);
  },
};

/** Flute: a breathy chiff, a mostly pure tone, vibrato that arrives late. */
const flute: Voice = {
  sustained: true,
  tail: 0.2,
  play(c, out, t, midi, dur, v) {
    const f = hz(midi);
    const end = t + dur;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.05);
    g.gain.linearRampToValueAtTime(0.86 * v, t + Math.min(0.25, dur));
    g.gain.setTargetAtTime(0, end, 0.05);
    const lp = filter(c, "lowpass", 3800);
    g.connect(lp).connect(out);
    const freqs: AudioParam[] = [];
    for (const [ratio, amp] of [
      [1, 1],
      [2, 0.16],
      [3, 0.05],
    ] as const) {
      const o = c.createOscillator();
      o.frequency.value = f * ratio;
      freqs.push(o.frequency);
      const a = c.createGain();
      a.gain.value = amp;
      o.connect(a).connect(g);
      o.start(t);
      o.stop(end + 0.3);
    }
    vibrato(c, t + 0.2, 5.1, f * 0.004, freqs).stop(end + 0.3);
    // the breath: a chiff at the start and a whisper under the tone
    noise(c, out, grains(c, 0.06, [[0, 1, 0.045]]), [filter(c, "bandpass", f * 2, 2)], 0.1 * v, t);
    noise(c, g, grains(c, dur + 0.1, [[0, 1, dur + 0.1]]), [filter(c, "bandpass", f, 3)], 0.05, t);
  },
};

/** Soft strings: two gently detuned saws through a closed filter, slow bow. */
const strings: Voice = {
  sustained: true,
  tail: 0.6,
  play(c, out, t, midi, dur, v) {
    const f = hz(midi);
    const end = t + dur;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + Math.min(0.28, dur * 0.5));
    g.gain.setTargetAtTime(0, end, 0.14);
    const lp = filter(c, "lowpass", 1500, 0.5);
    g.connect(lp).connect(out);
    const freqs: AudioParam[] = [];
    for (const cents of [-4, 4]) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f * 2 ** (cents / 1200);
      freqs.push(o.frequency);
      const a = c.createGain();
      a.gain.value = 0.3;
      o.connect(a).connect(g);
      o.start(t);
      o.stop(end + 0.7);
    }
    vibrato(c, t + 0.3, 5.3, f * 0.0025, freqs).stop(end + 0.7);
  },
};

/** A soft, round bass with enough overtones to be heard on a phone. */
const bass: Voice = {
  sustained: true,
  tail: 0.25,
  play(c, out, t, midi, dur, v) {
    const f = hz(midi);
    const end = t + dur;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.55 * v, t + 0.006);
    g.gain.setTargetAtTime(0.27 * v, t + 0.006, 0.18);
    g.gain.setTargetAtTime(0, end, 0.05);
    const lp = filter(c, "lowpass", 1100);
    g.connect(lp).connect(out);
    for (const [ratio, amp] of [
      [1, 1],
      [2, 0.42],
      [3, 0.14],
    ] as const) {
      const o = c.createOscillator();
      o.frequency.value = f * ratio;
      const a = c.createGain();
      a.gain.value = amp;
      o.connect(a).connect(g);
      o.start(t);
      o.stop(end + 0.3);
    }
  },
};

/** One shake of small harness bells: a few bells and their rattle. `midi` picks a variant. */
const bells: Voice = {
  sustained: false,
  tail: 0.4,
  play(c, out, t, _midi, _dur, v) {
    sleighBell(c, out, t, v);
  },
};

export function sleighBell(
  c: BaseAudioContext,
  out: AudioNode,
  t: number,
  intensity: number,
): void {
  const lp = filter(c, "lowpass", 8000);
  lp.connect(out);
  const hits = 3 + Math.round(intensity * 4);
  for (let h = 0; h < hits; h++)
    partials(
      c,
      lp,
      t + Math.random() * 0.04,
      rnd(2400, 3800),
      rnd(0.2, 0.5) * intensity,
      [
        [1, 1, 0.15],
        [1.51, 0.45, 0.1],
        [2.24, 0.25, 0.06],
      ],
      0.0015,
    );
  noise(
    c,
    lp,
    grains(c, 0.06, [[0, 1, 0.035]]),
    [filter(c, "bandpass", 6000, 1.3)],
    0.14 * intensity,
    t,
  );
}

/** A light woodblock tick. */
const block: Voice = {
  sustained: false,
  tail: 0.18,
  play(c, out, t, midi, _dur, v) {
    const f = hz(midi);
    partials(
      c,
      out,
      t,
      f,
      v,
      [
        [1, 1, 0.07],
        [1.58, 0.35, 0.035],
      ],
      0.001,
    );
    noise(
      c,
      out,
      grains(c, 0.01, [[0, 1, 0.004]]),
      [filter(c, "bandpass", 2600, 1.5)],
      0.25 * v,
      t,
    );
  },
};

export const VOICES = { marimba, celesta, glock, pizz, flute, strings, bass, bells, block };
export type Inst = keyof typeof VOICES;
/** One note: instrument, pitch, start (s), written length (s), velocity, pan (-1…1). */
export type Note = { i: Inst; m: number; t: number; d: number; v: number; p: number };

const keyOf = (n: Note) => `${n.m}:${VOICES[n.i].sustained ? n.d.toFixed(3) : 0}`;
const yieldToPage = () => new Promise((r) => setTimeout(r, 0));

/** Every distinct note of one instrument, rendered once, back to back. */
async function renderNotes(inst: Inst, notes: Note[], rate: number) {
  const voice = VOICES[inst];
  const uniq = new Map<string, Note>();
  for (const n of notes) uniq.set(keyOf(n), n);
  const items = [...uniq].map(([k, n]) => ({
    k,
    n,
    len: (voice.sustained ? n.d : 0) + voice.tail,
  }));
  let at = 0.01;
  const starts = items.map((it) => {
    const s = at;
    at += it.len + 0.02;
    return s;
  });
  const c = offline(at, rate);
  items.forEach((it, j) => voice.play(c, c.destination, starts[j]!, it.n.m, it.n.d, 1));
  const d = (await c.startRendering()).getChannelData(0);
  const sr = c.sampleRate;
  return {
    sr,
    notes: new Map(
      items.map((it, j) => [
        it.k,
        d.slice(Math.round(starts[j]! * sr), Math.round((starts[j]! + it.len) * sr)),
      ]),
    ),
  };
}

/** `peak`: normalise to this (0 keeps the raw level, for balancing the band). */
export type EnsembleOpts = { rate: number; loop?: number; room?: number; peak?: number };

/**
 * Render a list of notes to a stereo buffer: notes placed and panned in JS,
 * then a short bright room, gentle tone shaping and a soft compressor. With
 * `loop`, everything that rings past the end wraps onto the start, so the
 * buffer loops without a seam.
 */
export async function ensemble(notes: Note[], o: EnsembleOpts): Promise<AudioBuffer> {
  const groups = new Map<Inst, Note[]>();
  for (const n of notes) groups.set(n.i, [...(groups.get(n.i) ?? []), n]);
  const end = Math.max(
    ...notes.map((n) => n.t + (VOICES[n.i].sustained ? n.d : 0) + VOICES[n.i].tail),
  );
  let L: Float32Array | null = null;
  let R: Float32Array | null = null;
  let sr = o.rate;
  for (const [inst, list] of groups) {
    const rendered = await renderNotes(inst, list, o.rate);
    sr = rendered.sr;
    const N = Math.ceil((o.loop ?? end) * sr);
    L ??= new Float32Array(N);
    R ??= new Float32Array(N);
    for (const n of list) {
      const s = rendered.notes.get(keyOf(n))!;
      const start = Math.round(n.t * sr);
      const th = ((Math.max(-1, Math.min(1, n.p)) + 1) * Math.PI) / 4;
      const gl = n.v * Math.cos(th);
      const gr = n.v * Math.sin(th);
      for (let k = 0; k < s.length; k++) {
        let idx = start + k;
        if (o.loop) idx = ((idx % N) + N) % N;
        else if (idx < 0 || idx >= N) continue;
        L[idx]! += s[k]! * gl;
        R[idx]! += s[k]! * gr;
      }
    }
    await yieldToPage(); // mixing in slices keeps the page responsive
  }
  if (!L || !R) throw new Error("Nothing to play");
  const N = L.length;
  const tail = 1.4;
  const c = offline(N / sr + tail, sr, 2);
  const src = c.createBufferSource();
  const dry = c.createBuffer(2, N, sr);
  dry.copyToChannel(L as Float32Array<ArrayBuffer>, 0);
  dry.copyToChannel(R as Float32Array<ArrayBuffer>, 1);
  src.buffer = dry;
  const shape = [
    filter(c, "highpass", 55, 0.7),
    filter(c, "peaking", 280, 0.8, -1.5), // no boom
    filter(c, "highshelf", 6500, 0.7, -4), // no glare
  ];
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 2.5;
  comp.attack.value = 0.01;
  comp.release.value = 0.25;
  let node: AudioNode = src;
  for (const f of shape) node = node.connect(f);
  node.connect(comp);
  const room = c.createConvolver();
  room.normalize = true;
  room.buffer = impulse(c, 1.1, 0.26, 2, 0.6);
  const wet = c.createGain();
  wet.gain.value = o.room ?? 0.22;
  node.connect(room).connect(wet).connect(comp);
  comp.connect(c.destination);
  src.start(0);
  const out = await c.startRendering();
  const chans = [out.getChannelData(0), out.getChannelData(1)];
  let peak = 0;
  for (const d of chans) for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]!));
  const k = peak > 0 && o.peak !== 0 ? (o.peak ?? 0.85) / peak : 1; // peak 0: raw level
  const result = new AudioBuffer({
    length: o.loop ? N : out.length,
    sampleRate: sr,
    numberOfChannels: 2,
  });
  chans.forEach((d, ch) => {
    const r = result.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      const idx = o.loop ? i % N : i;
      r[idx]! += d[i]! * k;
    }
    if (!o.loop) {
      const fade = Math.min(r.length, Math.floor(0.05 * sr));
      for (let i = 0; i < fade; i++) r[r.length - 1 - i]! *= i / fade;
    }
  });
  return result;
}
