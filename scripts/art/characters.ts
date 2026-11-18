// Santa (walk/idle/place/cheer sheets) and the Rudolph + sleigh team.
// Parts are drawn as palette maps and layered per frame; a dark outline is
// added last so the characters read clearly against bright snow.
import { Px } from "../lib/px.ts";
import { C } from "../lib/palette.ts";

const PAL: Record<string, string> = {
  R: C.red4,
  r: C.red3,
  d: C.red2,
  D: C.red1,
  W: C.snow6,
  w: C.snow4,
  v: C.snow3,
  S: C.skin2,
  s: C.skin1,
  t: C.skin0,
  p: C.cheek,
  e: C.ink,
  k: C.boot0,
  K: C.boot1,
  L: C.boot2,
  g: C.gold3,
  G: C.gold1,
  a: C.wood5,
  A: C.wood4,
  z: C.wood3,
  Z: C.wood2,
  y: C.gold2,
  x: C.red3,
  X: C.gold3,
};

function draw(px: Px, rows: readonly string[], ox = 0, oy = 0): void {
  px.map(ox, oy, rows, PAL);
}

// ------------------------------------------------------------------ Santa

export const SANTA = { w: 26, h: 30, footY: 28 } as const;
type Dir = "s" | "n" | "e";
type Sack = "empty" | "full";

// upper body (hat → hem) for each facing; legs and arms are layered separately
const BODY: Record<Dir, readonly string[]> = {
  s: [
    "..........................",
    "............rr............",
    "...........rRrd...........",
    "..........rRrrrdd.WW......",
    ".........rRrrrrrdWWWw.....",
    "........rRrrrrrrd.wwv.....",
    ".......rRrrrrrrrrd........",
    "......WWWWWWWWWWWWWw......",
    "......wWWWWWWWWWWWwv......",
    ".......wSSSSSSSSSSw.......",
    ".......WSSeSSSSeSsW.......",
    "......WWpSSSttSSSpWw......",
    "......WWWWWWwwWWWWWWw.....",
    ".....rWWWWWWWWWWWWWWwd....",
    "....rRrWWWWWWWWWWWWwdd....",
    "....rRrrWWWWWWWWWWwrddD...",
    "....rrrrrWWWWWWWWwrrddD...",
    "....rrrrrrWWWWWWwrrrddD...",
    "....rrrrrrrvWWvrrrrrddD...",
    "....rrrrrrrrvvrrrrrrddD...",
    "....kkkkkkkkggkkkkkkkkk...",
    "....WWWWWWWWWWWWWWWWWwv...",
    ".....wwwwwwwwwwwwwwwwv....",
  ],
  n: [
    "..........................",
    "............rr............",
    "...........rrrd...........",
    "......WW.RrrrRrd..........",
    ".....WWWwRrrrrrrd.........",
    ".....wvv.RrrrrrrrD........",
    ".......rRrrrrrrrrd........",
    "......WWWWWWWWWWWWWw......",
    "......wWWWWWWWWWWWwv......",
    ".......WWWWWWWWWWWw.......",
    ".......WWWWWWWWWWWw.......",
    "......wWWWWWWWWWWWww......",
    "......vwwwwwwwwwwwwv......",
    ".....rRrrrrrrrrrrrrrd.....",
    "....rRrrrrrrrrrrrrrrdd....",
    "....rRrrrrrrrrrrrrrrddD...",
    "....rrrrrrrrrrrrrrrrddD...",
    "....rrrrrrrrrrrrrrrrddD...",
    "....rrrrrrrrrrrrrrrrddD...",
    "....rrrrrrrrrrrrrrrrddD...",
    "....kkkkkkkkkkkkkkkkkkk...",
    "....WWWWWWWWWWWWWWWWWwv...",
    ".....wwwwwwwwwwwwwwwwv....",
  ],
  e: [
    "..........................",
    ".........rrr..............",
    ".......drRRrr.............",
    ".....WWdrrRrrr............",
    "....WWWd.rrRrrr...........",
    "....wvv..drrRrrr..........",
    ".........drrrRrrr.........",
    "........WWWWWWWWWWw.......",
    "........wWWWWWWWWWwv......",
    ".........wWSSSSSSSS.......",
    ".........wWSSSSSeSSS......",
    ".........wWSSSSpSSSts.....",
    ".........wWWWWWWWWWWW.....",
    "........rrwWWWWWWWWWWW....",
    ".......rRrrwWWWWWWWWWW....",
    "......rRrrrrwWWWWWWWWw....",
    "......rrrrrrrwWWWWWWw.....",
    "......rrrrrrrrrwWWWwrr....",
    "......rrrrrrrrrrrrrrrrr...",
    "......drrrrrrrrrrrrrrrd...",
    "......kkkkkkkkkkkkkkgkk...",
    "......WWWWWWWWWWWWWWWWw...",
    ".......wwwwwwwwwwwwwwv....",
  ],
};

// burlap sack: behind the shoulder (s), across the back (n), on the back (e)
const SACKS: Record<
  Dir,
  Record<Sack, { rows: readonly string[]; x: number; y: number; front: boolean }>
> = {
  s: {
    empty: { x: 18, y: 9, front: false, rows: [".aA..", "aAAz.", "AAzzZ", "AzzZ.", ".zZ.."] },
    full: {
      x: 17,
      y: 3,
      front: false,
      rows: [
        "...xX..",
        "..xXxx.",
        "..aAyAz",
        ".aAAAzz",
        "aAAAAzzZ",
        "AAAAzzzZ",
        "AAAzzzZZ",
        ".zzzzZZ.",
        "..zZZZ..",
      ],
    },
  },
  n: {
    empty: {
      x: 8,
      y: 11,
      front: true,
      rows: ["...yy.....", "..aAAAz...", ".aAAAAzz..", ".AAAAzzzZ.", "..AzzzzZ..", "...zZZ...."],
    },
    full: {
      x: 6,
      y: 7,
      front: true,
      rows: [
        ".....xXx......",
        "....xxXxx.....",
        "...aAAyAAz....",
        "..aAAAAAAzz...",
        ".aAAAAAAAzzz..",
        ".AAAAAAAAzzzZ.",
        ".AAAAAAAzzzzZ.",
        ".AAAAAAzzzzZZ.",
        "..AAAzzzzzZZ..",
        "...zzzzzZZZ...",
        "....zZZZZ.....",
      ],
    },
  },
  e: {
    empty: {
      x: 3,
      y: 11,
      front: false,
      rows: ["..ay..", ".aAAz.", "aAAzz.", "AAAzzZ", "AAzzZZ", ".AzzZ.", "..zZ.."],
    },
    full: {
      x: 0,
      y: 5,
      front: false,
      rows: [
        "...xX....",
        "..xXxx...",
        "..aAyAz..",
        ".aAAAAzz.",
        "aAAAAAzzz",
        "AAAAAAzzZ",
        "AAAAAzzzZ",
        "AAAAzzzZZ",
        "AAAzzzzZZ",
        ".AAzzzZZ.",
        ".AzzzZZ..",
        "..zZZZ...",
      ],
    },
  },
};

const MITTEN = ["kK", "kk"];

/** Front/back legs: trousers from the hip down, boots at the bottom, `lift` raises a foot. */
function legsFront(px: Px, lift: readonly [number, number]): void {
  const xs = [8, 15];
  xs.forEach((x, i) => {
    const l = lift[i]!;
    for (let y = 21; y <= 24 - l; y++) px.hline(x, x + 2, y, y === 24 - l ? C.red1 : C.red2);
    px.hline(x - 1, x + 2, 25 - l, C.boot1);
    px.hline(x - 1, x + 2, 26 - l, C.boot0);
    px.set(x - 1, 25 - l, C.boot2);
  });
}

/** Side legs: two diagonal legs from the hip to each foot; the far leg is darker. */
function legsSide(px: Px, far: number, near: number): void {
  const hip = 13;
  for (const [fx, farLeg] of [
    [far, true],
    [near, false],
  ] as const) {
    for (let y = 21; y <= 24; y++) {
      const x = Math.round(hip + ((fx - hip) * (y - 21)) / 3);
      px.hline(x, x + 2, y, farLeg ? C.red1 : y === 24 ? C.red1 : C.red2);
    }
    px.hline(fx - 1, fx + 3, 25, farLeg ? C.boot0 : C.boot1);
    px.hline(fx - 1, fx + 3, 26, C.boot0);
    if (!farLeg) px.set(fx + 3, 25, C.boot2);
  }
}

type Pose = {
  dir: Dir;
  sack: Sack;
  dy?: number; // body bob
  legs?: readonly [number, number]; // front: lift per leg · side: foot x (far, near)
  arm?: number; // side arm swing: -1 back · 0 · 1 forward
  mittens?: readonly [number, number]; // front: y offset per mitten
  blink?: boolean;
  hold?: "chest" | "ground" | "reach";
  cheer?: number; // 0 none, 1 arms up, 2 arms up high
};

function sideArm(px: Px, swing: number, dy: number): void {
  // sleeve from the shoulder, mitten at the end
  const end = swing > 0 ? [17, 18] : swing < 0 ? [9, 18] : [13, 19];
  const [ex, ey] = end as [number, number];
  const sx = 12;
  const sy = 14 + dy;
  const n = Math.max(Math.abs(ex - sx), Math.abs(ey + dy - sy));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(sx + ((ex - sx) * i) / n);
    const y = Math.round(sy + ((ey + dy - sy) * i) / n);
    px.set(x - 1, y, C.red1); // seam against the body
    px.set(x, y, i < 3 ? C.red4 : C.red3);
    px.set(x + 1, y, C.red3);
    px.set(x + 2, y, C.red2);
  }
  px.hline(ex - 1, ex + 2, ey + dy, C.snow5); // fur cuff
  draw(px, MITTEN, ex, ey + dy + 1);
}

const BOX = ["xXxx", "XXXX", "xXxx", "xXxx"];

function santaFrame(p: Pose): Px {
  const px = new Px(SANTA.w, SANTA.h);
  const dy = p.dy ?? 0;
  const sack = SACKS[p.dir][p.sack];
  if (!sack.front) draw(px, sack.rows, sack.x, sack.y + dy);
  if (p.dir === "e") legsSide(px, p.legs?.[0] ?? 12, p.legs?.[1] ?? 14);
  else legsFront(px, (p.legs as [number, number]) ?? [0, 0]);
  let body = BODY[p.dir];
  if (p.blink && p.dir !== "n") body = body.map((row) => row.replace(/e/g, "t"));
  draw(px, body, 0, dy);
  if (sack.front) draw(px, sack.rows, sack.x, sack.y + dy);

  if (p.dir === "e") {
    if (p.hold === "chest") {
      for (let x = 12; x <= 17; x++) px.hline(x, x, 15 + dy, x < 14 ? C.red4 : C.red3);
      px.hline(12, 17, 16 + dy, C.red2);
      draw(px, BOX, 18, 13 + dy);
      draw(px, MITTEN, 17, 15 + dy);
    } else if (p.hold === "ground" || p.hold === "reach") {
      for (let i = 0; i < 6; i++) {
        px.set(13 + i, 15 + dy + i, C.red3);
        px.set(14 + i, 15 + dy + i, C.red2);
      }
      px.hline(18, 20, 20 + dy, C.snow5);
      if (p.hold === "ground") draw(px, BOX, 19, 23);
      draw(px, MITTEN, 19, 21 + dy);
    } else sideArm(px, p.arm ?? 0, dy);
  } else if (p.cheer) {
    const up = p.cheer === 2 ? 1 : 0;
    for (const side of [-1, 1] as const) {
      const sx = side < 0 ? 5 : 20;
      for (let i = 0; i < 6; i++) {
        const x = sx + side * Math.floor(i / 2);
        px.hline(x, x + 1, 14 + dy - i, i === 5 ? C.snow5 : side < 0 ? C.red4 : C.red2);
      }
      draw(px, MITTEN, sx + side * 3, 6 + dy - up);
    }
  } else {
    const [ml, mr] = p.mittens ?? [0, 0];
    draw(px, MITTEN, 3, 19 + dy + ml);
    draw(px, MITTEN, 21, 19 + dy + mr);
  }
  px.outline(C.ink);
  return px;
}

/** Every Santa frame in a fixed order plus the animation → frame index table. */
export function santaSheet(): { sheet: Px; cols: number; anims: Record<string, number[]> } {
  const frames: Px[] = [];
  const anims: Record<string, number[]> = {};
  const add = (name: string, poses: Pose[]) => {
    anims[name] = poses.map((p) => frames.push(santaFrame(p)) - 1);
  };
  for (const sack of ["empty", "full"] as const) {
    const t = sack;
    add(`idle-s-${t}`, [
      { dir: "s", sack },
      { dir: "s", sack, blink: true },
    ]);
    add(`idle-n-${t}`, [{ dir: "n", sack }]);
    add(`idle-e-${t}`, [
      { dir: "e", sack },
      { dir: "e", sack, blink: true },
    ]);
    add(`walk-s-${t}`, [
      { dir: "s", sack, legs: [0, 1], mittens: [1, -1] },
      { dir: "s", sack, dy: -1, legs: [0, 0] },
      { dir: "s", sack, legs: [1, 0], mittens: [-1, 1] },
      { dir: "s", sack, dy: -1, legs: [0, 0] },
    ]);
    add(`walk-n-${t}`, [
      { dir: "n", sack, legs: [0, 1], mittens: [1, -1] },
      { dir: "n", sack, dy: -1, legs: [0, 0] },
      { dir: "n", sack, legs: [1, 0], mittens: [-1, 1] },
      { dir: "n", sack, dy: -1, legs: [0, 0] },
    ]);
    add(`walk-e-${t}`, [
      { dir: "e", sack, legs: [9, 17], arm: -1 },
      { dir: "e", sack, dy: -1, legs: [12, 14], arm: 0 },
      { dir: "e", sack, legs: [17, 9], arm: 1 },
      { dir: "e", sack, dy: -1, legs: [14, 12], arm: 0 },
    ]);
  }
  add("place-e", [
    { dir: "e", sack: "full", hold: "chest" },
    { dir: "e", sack: "full", dy: 2, legs: [10, 16], hold: "ground" },
    { dir: "e", sack: "full", dy: 2, legs: [10, 16], hold: "reach" },
  ]);
  add("cheer-s", [
    { dir: "s", sack: "empty", cheer: 1 },
    { dir: "s", sack: "empty", dy: -1, cheer: 2 },
  ]);
  const cols = 8;
  const rows = Math.ceil(frames.length / cols);
  const sheet = new Px(cols * SANTA.w, rows * SANTA.h);
  frames.forEach((f, i) => sheet.blit(f, (i % cols) * SANTA.w, Math.floor(i / cols) * SANTA.h));
  return { sheet, cols, anims };
}

// ------------------------------------------------------------------ Rudolph + sleigh

export const TEAM = { w: 84, h: 40, noseX: 81, noseY: 13, groundY: 38 } as const;

const DEER_PAL: Record<string, string> = {
  a: C.antler,
  A: C.antlerShade,
  B: C.fur1,
  b: C.fur0,
  c: C.fur3,
  C: C.fur2,
  o: C.ink,
  N: C.nose,
  n: C.red3,
  h: C.boot0,
  R: C.red3,
  g: C.gold3,
  G: C.gold1,
  W: C.snow6,
};

// Rudolph facing east; legs are drawn per frame
const DEER = [
  "..................a..a.....",
  ".................aA.aA.....",
  "..................aAA......",
  "...................AA......",
  "..................BBBB.....",
  ".................BBBoBBb...",
  ".................BBBBBBBNN.",
  "..................bCCCCbNN.",
  ".................BBb.......",
  "...bBBBBBBBBBBBBBBBRb......",
  "..bBBBBBBBBBBBBBBBRgRb.....",
  ".bBBBBBBBBBBBBBBBBBRb......",
  ".bBcccccccccccccBBBb.......",
  "..bcccccccccccccbb.........",
];

type DeerLegs = "stand" | "reach" | "mid" | "tuck";

function deer(px: Px, ox: number, oy: number, legs: DeerLegs, headDy = 0): void {
  px.map(ox, oy + headDy, DEER.slice(0, 9), DEER_PAL);
  px.map(ox, oy + 9, DEER.slice(9), DEER_PAL);
  const leg = (x0: number, y0: number, x1: number, y1: number, far: boolean) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n);
      const y = Math.round(y0 + ((y1 - y0) * i) / n);
      px.set(ox + x, oy + y, far ? C.fur0 : C.fur1);
      px.set(ox + x + 1, oy + y, far ? C.fur0 : C.fur0);
    }
    px.hline(ox + x1, ox + x1 + 1, oy + y1 + 1, C.boot0);
  };
  // front legs hang from x≈16, hind legs from x≈4 (body bottom at y 13)
  const L: Record<DeerLegs, [number, number, number, number][]> = {
    stand: [
      [14, 13, 13, 20],
      [17, 13, 18, 20],
      [2, 13, 1, 20],
      [5, 13, 6, 20],
    ],
    reach: [
      [16, 13, 21, 17],
      [17, 13, 23, 16],
      [3, 13, -2, 17],
      [5, 13, 0, 18],
    ],
    mid: [
      [16, 13, 19, 18],
      [17, 13, 18, 19],
      [3, 13, 1, 18],
      [5, 13, 3, 19],
    ],
    tuck: [
      [16, 13, 14, 17],
      [17, 13, 19, 16],
      [3, 13, 6, 17],
      [5, 13, 2, 16],
    ],
  };
  L[legs].forEach(([a, b, c, d], i) => leg(a, b, c, d, i % 2 === 0));
  // tail
  px.set(ox + 1, oy + 9, C.fur3);
  px.set(ox, oy + 8, C.fur3);
}

const SLEIGH = [
  ".kk......................................",
  "kdddk...................................",
  "kdrrdk..................................",
  "kdrRrdk.................................",
  "kdrRrrdk............................ggg.",
  "kdrRrrrdkkkkkkkkkkkkkkkkkkkkkkkkkkkg...g",
  "kdrRRrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrdg..g",
  "kdrrRRRRRRRRRRRRRRRRRRRRRRRRRRRRrrrdg.g.",
  "kddrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrdgg..",
  ".kdrGgggggggggggggggggggggggggggGrdk....",
  ".kddrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrdk....",
  "..kddddrrrrrrrrrrrrrrrrrrrrrrrrrddk.....",
  "...kkkdddddddddddddddddddddddddddk......",
  "......kkkkkkkkkkkkkkkkkkkkkkkkkkk.......",
  ".......G.........G.........G............",
  ".......G.........G.........G............",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG.....",
  ".yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyGG..",
  "....................................yGG.",
  "......................................y.",
];

const SLEIGH_PAL: Record<string, string> = {
  k: C.red0,
  d: C.red1,
  r: C.red2,
  R: C.red3,
  g: C.gold3,
  G: C.gold1,
  y: C.gold2,
};

// seated Santa (upper body) visible above the sleigh rim, facing east
const RIDER = [
  "....rrr.......",
  "..drRRrr......",
  "WWdrrRrrr.....",
  "WWd.rrRrrr....",
  "wv..WWWWWWWw..",
  "....wWWWWWWWw.",
  ".....wWSSSSSS.",
  ".....wWSSSeSSS",
  ".....wWSSpSSts",
  ".....wWWWWWWWW",
  "....rrwWWWWWWW",
  "...rRrrwWWWWWW",
  "...rrrrrwWWWWw",
];

const CARGO = ["....xXx.....", "...xxXxx.ww.", "..aAAyAAzWW.", ".aAAAAAAzzv.", "aAAAAAAAzzz."];

function team(opts: { santa: boolean; legs: DeerLegs; bob: number; headDy?: number }): Px {
  const px = new Px(TEAM.w, TEAM.h);
  const sy = 14 + opts.bob; // sleigh top row
  draw(px, CARGO, 4, sy - 1);
  if (opts.santa) {
    draw(px, RIDER, 16, sy - 7);
    // arms forward holding the reins
    px.hline(25, 29, sy + 5, C.red3);
    px.hline(25, 29, sy + 6, C.red2);
    px.map(30, sy + 5, MITTEN, PAL);
  }
  px.map(0, sy + 4, SLEIGH, SLEIGH_PAL);
  // Rudolph pulls from the front, slightly ahead of the sleigh's bob
  const dx = 55;
  const dyDeer = sy - 7 - opts.bob + Math.round(opts.bob / 2);
  deer(px, dx, dyDeer, opts.legs, opts.headDy ?? 0);
  // traces from the sleigh front to the harness, reins from Santa's hands
  const from = [36, sy + 11];
  const to = [dx + 18, dyDeer + 10];
  const steps = to[0]! - from[0]!;
  for (let i = 0; i <= steps; i++) {
    const x = from[0]! + i;
    const y = Math.round(from[1]! + ((to[1]! - from[1]!) * i) / steps);
    px.set(x, y, C.wood1);
  }
  if (opts.santa) {
    const r0 = [32, sy + 6];
    const r1 = [dx + 17, dyDeer + 6];
    const n = r1[0]! - r0[0]!;
    for (let i = 0; i <= n; i++) {
      const x = r0[0]! + i;
      const sag = Math.sin((i / n) * Math.PI) * 2;
      px.set(x, Math.round(r0[1]! + ((r1[1]! - r0[1]!) * i) / n + sag), C.gold1);
    }
  }
  // bells on the harness
  px.set(dx + 19, dyDeer + 11, C.gold4);
  px.outline(C.ink);
  return px;
}

/** Sheet rows: fly with Santa ×4, fly empty ×4, parked ×2, parked with Santa ×2. */
export function teamSheet(): { sheet: Px; anims: Record<string, number[]> } {
  const cycle: Array<[DeerLegs, number]> = [
    ["reach", 0],
    ["mid", -1],
    ["tuck", -1],
    ["mid", 0],
  ];
  const frames: Px[] = [];
  const anims: Record<string, number[]> = {};
  const add = (name: string, list: Px[]) => {
    anims[name] = list.map((f) => frames.push(f) - 1);
  };
  add(
    "fly-santa",
    cycle.map(([legs, bob]) => team({ santa: true, legs, bob })),
  );
  add(
    "fly-empty",
    cycle.map(([legs, bob]) => team({ santa: false, legs, bob })),
  );
  add("park-empty", [
    team({ santa: false, legs: "stand", bob: 0 }),
    team({ santa: false, legs: "stand", bob: 0, headDy: 1 }),
  ]);
  add("park-santa", [
    team({ santa: true, legs: "stand", bob: 0 }),
    team({ santa: true, legs: "stand", bob: 0, headDy: 1 }),
  ]);
  const sheet = new Px(4 * TEAM.w, Math.ceil(frames.length / 4) * TEAM.h);
  frames.forEach((f, i) => sheet.blit(f, (i % 4) * TEAM.w, Math.floor(i / 4) * TEAM.h));
  return { sheet, anims };
}
