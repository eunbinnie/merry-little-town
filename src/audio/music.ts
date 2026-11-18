// The music, written out as notes for the synthesised band in instruments.ts.
//
// Village theme (G major, 116 BPM, 32 bars ≈ 66 s, loops seamlessly):
//   A  "Welcome to the village"  an original bouncy marimba tune
//   B  "Christmas exploration"   Jingle Bells (James Lord Pierpont, 1857,
//                                public domain): marimba with a flute
//                                counter-line, then flute and celesta
//   C  "A little Christmas magic" an original flute tune with celesta answers,
//                                turning on D7 back into A
// The finale quotes "We Wish You a Merry Christmas" (traditional English,
// public domain). All arrangements and the A and C tunes are our own.
import { rnd, type Inst, type Note } from "./instruments";

const BPM = 116;
const E = 60 / BPM / 2; // an eighth note
const BAR = 8 * E;
type Line = ReadonlyArray<readonly [number, number]>; // [midi (0 = rest), eighths]

const hum = () => rnd(-0.007, 0.007);

/** Lay a melodic line from `start`; `legato` shortens sustained notes a touch. */
function line(
  out: Note[],
  start: number,
  notes: Line,
  i: Inst,
  v: number,
  p: number,
  o: { shift?: number; legato?: number; unit?: number } = {},
): void {
  const unit = o.unit ?? E;
  let t = start;
  for (const [m, len] of notes) {
    if (m)
      out.push({
        i,
        m: m + (o.shift ?? 0),
        t: t + hum(),
        d: len * unit * (o.legato ?? 0.9),
        v: v * rnd(0.9, 1.05),
        p,
      });
    t += len * unit;
  }
}

const hit = (out: Note[], i: Inst, m: number, t: number, v: number, p: number, d = E) =>
  out.push({ i, m, t: t + hum(), d, v: v * rnd(0.9, 1.05), p });

/** Bass root, pizzicato and pad voicings (G major neighbourhood). */
const CHORDS: Record<string, { bass: number; tones: readonly number[] }> = {
  G: { bass: 43, tones: [55, 59, 62] },
  GB: { bass: 47, tones: [55, 59, 62] },
  Em: { bass: 40, tones: [55, 59, 64] },
  C: { bass: 48, tones: [55, 60, 64] },
  D: { bass: 50, tones: [54, 57, 62] },
  D7: { bass: 50, tones: [54, 57, 60] },
  Am: { bass: 45, tones: [57, 60, 64] },
  A7: { bass: 45, tones: [57, 61, 64] },
  Bm: { bass: 47, tones: [54, 59, 62] },
};

type Feel = {
  bass: "bounce" | "light";
  pad: number;
  bells: number;
  /** sleigh-bell eighths within each bar */
  bellAt?: readonly number[];
  marimbaEighths?: boolean;
  block?: boolean;
};

/** Bass, pizzicato, strings and bells under `bars` bars of half-bar `chords`. */
function accompany(out: Note[], start: number, chords: readonly string[], f: Feel): void {
  const bars = chords.length / 2;
  for (let b = 0; b < bars; b++) {
    const t0 = start + b * BAR;
    const c1 = CHORDS[chords[2 * b]!]!;
    const c2 = CHORDS[chords[2 * b + 1]!]!;
    const same = c1 === c2;
    // bass: root and fifth, with a little octave skip every other bar
    if (f.bass === "bounce") {
      hit(out, "bass", c1.bass, t0, 0.62, 0, 1.6 * E);
      hit(out, "bass", same ? c1.bass + 7 : c2.bass, t0 + 4 * E, 0.55, 0, 1.6 * E);
      if (b % 2 === 1) hit(out, "bass", c2.bass + 12, t0 + 7 * E, 0.38, 0, 0.7 * E);
    } else {
      hit(out, "bass", c1.bass, t0, 0.5, 0, 3 * E);
      hit(out, "bass", c2.bass + (same ? 7 : 0), t0 + 4 * E, 0.42, 0, 2.5 * E);
    }
    // pizzicato off-beats, lightly strummed
    for (const [pos, ch] of [
      [2, c1],
      [6, c2],
    ] as const)
      ch.tones.forEach((m, k) => hit(out, "pizz", m, t0 + pos * E + k * 0.012, 0.24, -0.35));
    // sustained strings, spread across the stereo field
    const pads = same
      ? [[c1, 8, 0]]
      : [
          [c1, 4, 0],
          [c2, 4, 4],
        ];
    for (const [ch, len, at] of pads as Array<[typeof c1, number, number]>)
      ch.tones.forEach((m, k) =>
        out.push({
          i: "strings",
          m: m + 12,
          t: t0 + at * E,
          d: len * E,
          v: f.pad,
          p: [-0.45, 0, 0.45][k]!,
        }),
      );
    // bouncy marimba eighths between the beats
    if (f.marimbaEighths)
      [1, 3, 5, 7].forEach((pos, k) => {
        const ch = pos < 4 ? c1 : c2;
        hit(out, "marimba", ch.tones[[0, 1, 2, 1][k]!]! + 12, t0 + pos * E, 0.2, -0.25);
      });
    for (const pos of f.bellAt ?? [2, 6])
      if (f.bells)
        hit(
          out,
          "bells",
          Math.floor(Math.random() * 4),
          t0 + pos * E,
          f.bells * rnd(0.85, 1.1),
          0.45,
        );
    if (f.block && b % 2 === 1) hit(out, "block", b % 4 === 1 ? 84 : 79, t0 + 7 * E, 0.3, -0.45);
  }
}

// ---------------------------------------------------------------- the village theme

const A_TUNE: Line = [
  [79, 1], [74, 1], [71, 1], [74, 1], [79, 2], [81, 1], [79, 1],
  [76, 3], [74, 1], [76, 1], [79, 1], [83, 2],
  [84, 2], [83, 1], [81, 1], [79, 2], [76, 2],
  [78, 1], [79, 1], [81, 2], [74, 3], [0, 1],
  [79, 1], [74, 1], [71, 1], [74, 1], [79, 2], [81, 1], [83, 1],
  [83, 2], [81, 1], [79, 1], [76, 2], [79, 1], [81, 1],
  [84, 2], [81, 1], [76, 1], [78, 2], [81, 1], [84, 1],
  [83, 2], [81, 1], [78, 1], [79, 4],
]; // prettier-ignore
const A_CHORDS = [
  "G",
  "G",
  "Em",
  "Em",
  "C",
  "C",
  "D",
  "D",
  "G",
  "G",
  "Em",
  "Em",
  "Am",
  "D7",
  "G",
  "G",
];

/** Jingle Bells, the chorus twice (second time with its closing turn), an octave below how it's played. */
const JINGLE: Line = [
  [71, 2], [71, 2], [71, 4], [71, 2], [71, 2], [71, 4],
  [71, 2], [74, 2], [67, 3], [69, 1], [71, 8],
  [72, 2], [72, 2], [72, 3], [72, 1], [72, 2], [71, 2], [71, 2], [71, 1], [71, 1],
  [71, 2], [69, 2], [69, 2], [71, 2], [69, 4], [74, 4],
  [71, 2], [71, 2], [71, 4], [71, 2], [71, 2], [71, 4],
  [71, 2], [74, 2], [67, 3], [69, 1], [71, 8],
  [72, 2], [72, 2], [72, 3], [72, 1], [72, 2], [71, 2], [71, 2], [71, 1], [71, 1],
  [74, 2], [74, 2], [72, 2], [69, 2], [67, 8],
]; // prettier-ignore
const B_CHORDS = [
  "G", "G", "G", "G", "G", "G", "G", "G", "C", "C", "G", "G", "Am", "D7", "D", "D",
  "G", "G", "G", "G", "G", "G", "G", "G", "C", "C", "G", "G", "D7", "D7", "G", "G",
]; // prettier-ignore
/** The flute's counter-line under the marimba, first time through. */
const COUNTER: Line = [
  [74, 8], [76, 4], [74, 4], [74, 4], [71, 4], [74, 2], [76, 2], [78, 2], [79, 2],
  [79, 4], [76, 4], [74, 8], [72, 4], [78, 4], [78, 4], [81, 4],
]; // prettier-ignore

const C_TUNE: Line = [
  [76, 3], [79, 1], [84, 2], [83, 1], [81, 1],
  [81, 3], [78, 1], [74, 4],
  [83, 3], [81, 1], [78, 2], [74, 2],
  [76, 3], [78, 1], [79, 2], [83, 2],
  [84, 3], [83, 1], [81, 2], [76, 2],
  [78, 2], [81, 2], [86, 4],
  [83, 2], [79, 2], [84, 2], [88, 2],
  [86, 2], [84, 2], [81, 2], [78, 2],
]; // prettier-ignore
const C_CHORDS = [
  "C",
  "C",
  "D",
  "D",
  "Bm",
  "Bm",
  "Em",
  "Em",
  "Am",
  "Am",
  "D",
  "D",
  "GB",
  "C",
  "D7",
  "D7",
];

export const VILLAGE_LOOP = 32 * BAR;

export function villageTheme(): Note[] {
  const n: Note[] = [];
  // A: welcome to the village
  const A = 0;
  line(n, A, A_TUNE, "marimba", 0.78, -0.15);
  line(n, A + 4 * BAR, A_TUNE.slice(22), "celesta", 0.26, 0.35, { shift: 12 });
  for (const [bar, pos] of [
    [0, 0],
    [4, 0],
    [7, 4],
  ] as const)
    hit(n, "glock", 91, A + bar * BAR + pos * E, 0.22, 0.3);
  accompany(n, A, A_CHORDS, { bass: "bounce", pad: 0.12, bells: 0.3, block: true });

  // B: Jingle Bells, marimba + flute counter, then flute + celesta over bouncing marimba
  const B = 8 * BAR;
  line(n, B, JINGLE.slice(0, 26), "marimba", 0.8, -0.15, { shift: 12 });
  line(n, B, COUNTER, "flute", 0.36, 0.25, { legato: 0.97 });
  const half = B + 8 * BAR;
  line(n, half, JINGLE.slice(26), "flute", 0.62, 0.2, { shift: 12, legato: 0.82 });
  line(n, half, JINGLE.slice(26), "celesta", 0.3, 0.35, { shift: 12 });
  accompany(n, B, B_CHORDS.slice(0, 16), { bass: "bounce", pad: 0.16, bells: 0.36, block: true });
  accompany(n, half, B_CHORDS.slice(16, 24), {
    bass: "bounce",
    pad: 0.18,
    bells: 0.4,
    marimbaEighths: true,
  });
  accompany(n, half + 4 * BAR, B_CHORDS.slice(24), {
    bass: "bounce",
    pad: 0.2,
    bells: 0.34,
    bellAt: [0, 2, 4, 6],
    marimbaEighths: true,
  });
  // little surprises: celesta runs while the tune holds its long notes
  line(
    n,
    B + 3 * BAR + 4 * E,
    [
      [79, 1],
      [81, 1],
      [83, 1],
      [86, 1],
    ],
    "celesta",
    0.34,
    0.35,
  );
  hit(n, "glock", 86, B + 7 * BAR + 4 * E, 0.24, 0.3);
  line(
    n,
    half + 3 * BAR + 4 * E,
    [
      [86, 1],
      [83, 1],
      [81, 1],
      [79, 1],
    ],
    "celesta",
    0.34,
    0.35,
  );
  hit(n, "glock", 91, half + 7 * BAR, 0.26, 0.3);

  // C: a little Christmas magic, then back home on D7
  const C = 24 * BAR;
  line(n, C, C_TUNE, "flute", 0.6, 0.15, { legato: 0.88 });
  line(
    n,
    C + BAR + 4 * E,
    [
      [90, 1],
      [93, 1],
      [90, 1],
      [86, 1],
    ],
    "celesta",
    0.28,
    0.4,
  );
  line(
    n,
    C + 5 * BAR + 4 * E,
    [
      [93, 1],
      [90, 1],
      [88, 1],
      [86, 1],
    ],
    "celesta",
    0.28,
    0.4,
  );
  accompany(n, C, C_CHORDS, { bass: "light", pad: 0.17, bells: 0 });
  const turn = C + 7 * BAR;
  line(
    n,
    turn + 4 * E,
    [
      [74, 1],
      [76, 1],
      [78, 1],
      [81, 1],
    ],
    "marimba",
    0.4,
    -0.2,
  );
  hit(n, "bells", 1, turn + 4 * E, 0.32, 0.45);
  hit(n, "bells", 2, turn + 6 * E, 0.5, 0.45);
  hit(n, "block", 84, turn + 7 * E, 0.24, -0.45);
  return n;
}

// ---------------------------------------------------------------- short cues

/** Gift collected: a quick rising sparkle with a jingle. */
export function giftCue(): Note[] {
  const n: Note[] = [];
  hit(n, "marimba", 79, 0, 0.5, -0.1);
  [79, 83, 86, 91, 95].forEach((m, k) =>
    hit(n, k < 3 ? "celesta" : "glock", m, 0.05 + k * 0.065, 0.45, 0.2 - k * 0.1),
  );
  hit(n, "bells", 0, 0.05, 0.4, 0.4);
  hit(n, "bells", 3, 0.32, 0.25, 0.4);
  return n;
}

/** A window lights up: a celesta arpeggio over a string swell; three voicings that climb. */
export const LIGHT_VOICINGS = [
  [67, 71, 74, 79, 83],
  [71, 74, 79, 83, 86],
  [74, 79, 83, 86, 91],
];
export function lightCue(arp: readonly number[]): Note[] {
  const n: Note[] = [];
  arp.forEach((m, k) => hit(n, "celesta", m, 0.02 + k * 0.09, 0.55 + k * 0.05, -0.3 + k * 0.15));
  hit(n, "glock", arp[arp.length - 1]! + 12, 0.48, 0.22, 0.35);
  [55, 59, 62].forEach((m, k) =>
    n.push({ i: "strings", m: m + 12, t: 0, d: 1.3, v: 0.2, p: [-0.4, 0, 0.4][k]! }),
  );
  hit(n, "bells", 2, 0.4, 0.22, 0.45);
  return n;
}

/** The postcard is ready: a warm little cadence for marimba and flute. */
export function postcardCue(): Note[] {
  const n: Note[] = [];
  const q = 0.17;
  const tune: Line = [
    [74, 1],
    [79, 1],
    [83, 2],
    [81, 1],
    [78, 1],
    [79, 4],
  ];
  line(n, 0, tune, "marimba", 0.7, -0.15, { unit: q });
  line(n, 0, tune, "flute", 0.38, 0.2, { unit: q, shift: -12, legato: 0.95 });
  for (const [at, ch] of [
    [0, "G"],
    [4, "D"],
    [6, "G"],
  ] as const) {
    CHORDS[ch]!.tones.forEach((m, k) => hit(n, "pizz", m, at * q + k * 0.012, 0.26, -0.3));
    hit(n, "bass", CHORDS[ch]!.bass, at * q, 0.5, 0, 2 * q);
  }
  [55, 59, 62].forEach((m, k) =>
    n.push({ i: "strings", m: m + 12, t: 6 * q, d: 1.2, v: 0.2, p: [-0.4, 0, 0.4][k]! }),
  );
  hit(n, "glock", 91, 6 * q, 0.22, 0.35);
  hit(n, "bells", 1, 6 * q, 0.3, 0.45);
  return n;
}

/** The whole village is lit: "We Wish You a Merry Christmas", festive and full. */
export function finaleCue(): Note[] {
  const n: Note[] = [];
  const q = 0.34;
  const tune: Line = [
    [74, 1],
    [79, 1], [79, 0.5], [81, 0.5], [79, 0.5], [78, 0.5],
    [76, 1], [76, 1], [76, 1],
    [81, 1], [81, 0.5], [83, 0.5], [81, 0.5], [79, 0.5],
    [78, 1], [74, 1], [74, 1],
    [83, 1], [83, 0.5], [84, 0.5], [83, 0.5], [81, 0.5],
    [79, 1], [76, 1], [74, 0.5], [74, 0.5],
    [76, 1], [81, 1], [78, 1],
    [79, 3],
  ]; // prettier-ignore
  line(n, 0, tune, "flute", 0.6, 0.15, { unit: q, legato: 0.85 });
  line(n, 0, tune, "celesta", 0.3, 0.35, { unit: q, shift: 12 });
  const bars = ["G", "C", "A7", "D", "Em", "C", "D", "G"];
  bars.forEach((name, b) => {
    const t0 = (1 + b * 3) * q;
    const ch = CHORDS[name]!;
    hit(n, "bass", ch.bass, t0, 0.6, 0, q * 0.9);
    for (const beat of [1, 2])
      ch.tones.forEach((m, k) => hit(n, "pizz", m, t0 + beat * q + k * 0.01, 0.22, -0.35));
    ch.tones.forEach((m, k) =>
      n.push({
        i: "strings",
        m: m + 12,
        t: t0,
        d: b === 7 ? 2.2 : 3 * q,
        v: 0.18,
        p: [-0.45, 0, 0.45][k]!,
      }),
    );
    for (const beat of [0, 1, 2])
      hit(n, "bells", (b + beat) % 4, t0 + beat * q, beat ? 0.25 : 0.38, 0.45);
  });
  const last = (1 + 7 * 3) * q;
  [79, 83, 86, 91].forEach((m, k) =>
    hit(n, "glock", m, last + 0.12 + k * 0.08, 0.3, 0.1 + k * 0.1),
  );
  hit(n, "marimba", 67, last, 0.5, -0.2);
  hit(n, "marimba", 71, last, 0.4, -0.2);
  return n;
}

/** Far off, now and then, a few soft bright chimes (ambience). */
export const CHIME_SHAPES = [
  [95, 91, 86],
  [86, 83, 79, 83],
];
export function chimeCue(shape: readonly number[]): Note[] {
  const n: Note[] = [];
  shape.forEach((m, k) => hit(n, "celesta", m, k * 0.24, 0.4 - k * 0.06, 0.5 - k * 0.3));
  return n;
}
