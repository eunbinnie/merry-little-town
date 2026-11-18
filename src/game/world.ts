// The village map in art pixels. Pure data + geometry with no runtime imports,
// shared by the asset generator (ground painting), the game (placement,
// collision) and the tests.

export type Pt = readonly [number, number];
export type Rect = readonly [number, number, number, number]; // x, y, w, h

export const ASSET_ROOT = "/assets/christmas";
export const WORLD = { w: 1024, h: 896 } as const;
/** Top edge of the painted ground image; the sky band sits above it. */
export const GROUND_Y = 166;
/** Santa can't walk north of this line (forest edge) or outside the margins. */
export const WALK = { x0: 18, y0: 226, x1: 1006, y1: 884 } as const;

export const SKY_TOP = "#0a101d";
export const SKY_LAYERS = {
  sky: { src: "backgrounds/sky.png", y: 0, h: 176 },
  stars: { src: "backgrounds/stars.png", y: 0, h: 150 },
  mountains: { src: "backgrounds/mountains.png", y: 102, h: 76 },
  forest: { src: "backgrounds/forest.png", y: 140, h: 46 },
} as const;
export const MOON: Pt = [96, 22];

export const BUILDING_IDS = [
  "workshop",
  "chapel",
  "bakery",
  "tea-house",
  "townhouse",
  "red-cottage",
  "shed",
  "stone-cottage",
  "woodland-cabin",
  "a-frame",
  "blue-cottage",
  "rose-cottage",
] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

/**
 * `x, y`: sprite top-left. `block`: footprint that blocks walking, relative to
 * the sprite. Door / gift / smoke anchors come from the generated sprite metadata.
 */
export const BUILDINGS: Record<BuildingId, { x: number; y: number; block: Rect }> = {
  workshop: { x: 450, y: 196, block: [8, 60, 108, 32] },
  chapel: { x: 118, y: 152, block: [8, 106, 64, 28] },
  bakery: { x: 340, y: 330, block: [4, 44, 78, 24] },
  "tea-house": { x: 588, y: 322, block: [5, 54, 72, 25] },
  townhouse: { x: 196, y: 298, block: [4, 80, 54, 24] },
  "red-cottage": { x: 64, y: 452, block: [5, 38, 64, 24] },
  shed: { x: 36, y: 602, block: [2, 24, 48, 21] },
  "stone-cottage": { x: 236, y: 624, block: [7, 34, 64, 24] },
  "woodland-cabin": { x: 872, y: 388, block: [0, 38, 78, 24] },
  "a-frame": { x: 862, y: 202, block: [3, 46, 72, 29] },
  "blue-cottage": { x: 336, y: 584, block: [5, 38, 64, 24] },
  "rose-cottage": { x: 572, y: 628, block: [7, 34, 64, 24] },
};

export const TREE = { x: 479, y: 380, block: [10, 86, 46, 16] as Rect, w: 66, h: 104 } as const;

/** Where the sleigh team stands when parked (ground point under the sleigh centre). */
export const SLEIGH_PARK: Pt = [652, 306];
/** Santa reaches into the cargo from here (west of the sleigh's back). */
export const SLEIGH_PICKUP: Pt = [602, 308];
export const SPAWN: Pt = [586, 316];

export type Road = { w: number; pts: readonly Pt[] };
export const ROADS: readonly Road[] = [
  // workshop ↔ plaza, and over to the sleigh clearing
  {
    w: 18,
    pts: [
      [512, 292],
      [517, 360],
      [512, 436],
    ],
  },
  {
    w: 13,
    pts: [
      [530, 300],
      [570, 308],
      [610, 310],
    ],
  },
  // bakery & tea house ↔ plaza
  {
    w: 12,
    pts: [
      [387, 400],
      [412, 428],
      [446, 452],
    ],
  },
  {
    w: 12,
    pts: [
      [641, 406],
      [616, 434],
      [580, 454],
    ],
  },
  // west: plaza ↔ townhouse ↔ red cottage ↔ shed
  {
    w: 16,
    pts: [
      [432, 486],
      [370, 472],
      [300, 444],
      [244, 414],
      [227, 408],
    ],
  },
  {
    w: 13,
    pts: [
      [227, 410],
      [182, 428],
      [150, 468],
      [116, 508],
      [100, 520],
    ],
  },
  {
    w: 11,
    pts: [
      [100, 522],
      [84, 584],
      [64, 648],
    ],
  },
  // chapel lane
  {
    w: 11,
    pts: [
      [158, 288],
      [168, 340],
      [198, 388],
      [222, 408],
    ],
  },
  // east: plaza ↔ bridge ↔ woodland cabin, branch north to the A-frame
  {
    w: 16,
    pts: [
      [592, 486],
      [680, 462],
      [760, 446],
      [820, 444],
      [870, 450],
      [910, 454],
    ],
  },
  {
    w: 12,
    pts: [
      [852, 446],
      [866, 390],
      [886, 330],
      [900, 280],
    ],
  },
  // south: plaza ↔ village entrance; branches to the stone cottage and the pond
  {
    w: 18,
    pts: [
      [512, 532],
      [506, 610],
      [496, 690],
      [506, 790],
      [512, 900],
    ],
  },
  {
    w: 13,
    pts: [
      [502, 640],
      [420, 664],
      [340, 684],
      [273, 686],
    ],
  },
  {
    w: 11,
    pts: [
      [500, 714],
      [580, 724],
      [660, 716],
    ],
  },
  // doorstep paths for the neighbours' cottages
  {
    w: 10,
    pts: [
      [372, 648],
      [378, 676],
    ],
  },
  {
    w: 10,
    pts: [
      [609, 688],
      [610, 722],
    ],
  },
];

export const PLAZA = { cx: 512, cy: 484, rx: 88, ry: 56 } as const;
export const RIVER = {
  w: 22,
  pts: [
    [790, 170],
    [786, 250],
    [800, 340],
    [790, 440],
    [772, 540],
    [784, 620],
    [796, 676],
  ] as readonly Pt[],
} as const;
export const POND = { cx: 806, cy: 718, rx: 118, ry: 58 } as const;
/** Footbridge sprite top-left (48×34); its deck rows are walkable over the river. */
export const BRIDGE = { x: 766, y: 422, deck: [766, 431, 48, 21] as Rect } as const;

export type LampGroup = "always" | "plaza" | BuildingId;
/** Lamp sprite top-left (9×30). `step`: plaza lamps light one by one with progress. */
export const LAMPS: ReadonlyArray<{ x: number; y: number; group: LampGroup; step?: number }> = [
  { x: 548, y: 276, group: "always" },
  { x: 488, y: 330, group: "always" },
  { x: 420, y: 424, group: "plaza", step: 1 },
  { x: 596, y: 424, group: "plaza", step: 3 },
  { x: 418, y: 520, group: "plaza", step: 5 },
  { x: 598, y: 520, group: "plaza", step: 7 },
  { x: 266, y: 392, group: "townhouse" },
  { x: 140, y: 482, group: "red-cottage" },
  { x: 316, y: 650, group: "stone-cottage" },
  { x: 738, y: 418, group: "woodland-cabin" },
  { x: 860, y: 270, group: "a-frame" },
  { x: 366, y: 388, group: "bakery" },
  { x: 664, y: 392, group: "tea-house" },
  { x: 526, y: 752, group: "plaza", step: 7 },
];

export type PropKind =
  | "pine-large"
  | "pine-small"
  | "pine-tiny"
  | "bench"
  | "snowman"
  | "signpost"
  | "crates"
  | "fence"
  | "fence-side"
  | "candy-cane";

export type Prop = { kind: PropKind; x: number; y: number; flip?: boolean };

/** Sprite size + footprint (relative to top-left) for each prop kind. */
export const PROP_KINDS: Record<
  PropKind,
  { src: string; w: number; h: number; block: Rect | null }
> = {
  "pine-large": { src: "decorations/pine-large.png", w: 30, h: 50, block: [10, 42, 10, 7] },
  "pine-small": { src: "decorations/pine-small.png", w: 20, h: 32, block: [6, 25, 8, 6] },
  "pine-tiny": { src: "decorations/pine-tiny.png", w: 12, h: 20, block: [3, 15, 6, 4] },
  bench: { src: "decorations/bench.png", w: 24, h: 15, block: [1, 8, 22, 6] },
  snowman: { src: "decorations/snowman.png", w: 18, h: 24, block: [3, 17, 12, 6] },
  signpost: { src: "decorations/signpost.png", w: 22, h: 26, block: [8, 21, 7, 4] },
  crates: { src: "decorations/crates.png", w: 30, h: 22, block: [1, 10, 26, 11] },
  fence: { src: "decorations/fence.png", w: 34, h: 11, block: [0, 5, 34, 6] },
  "fence-side": { src: "decorations/fence-side.png", w: 6, h: 44, block: [1, 0, 5, 40] },
  "candy-cane": { src: "decorations/candy-cane.png", w: 6, h: 14, block: null },
};

const HAND_PROPS: Prop[] = [
  // plaza benches + workshop crates
  { kind: "bench", x: 446, y: 548 },
  { kind: "bench", x: 556, y: 548 },
  { kind: "crates", x: 420, y: 266 },
  { kind: "crates", x: 584, y: 260 },
  // pond benches, snowmen, signposts
  { kind: "bench", x: 628, y: 740 },
  { kind: "bench", x: 676, y: 794 },
  { kind: "snowman", x: 330, y: 540 },
  { kind: "snowman", x: 664, y: 552 },
  { kind: "snowman", x: 176, y: 742 },
  { kind: "signpost", x: 528, y: 816 },
  { kind: "signpost", x: 690, y: 424 },
  // garden fences
  { kind: "fence", x: 30, y: 548 },
  { kind: "fence", x: 64, y: 548 },
  { kind: "fence", x: 190, y: 724 },
  { kind: "fence", x: 224, y: 724 },
  { kind: "fence", x: 258, y: 724 },
  { kind: "candy-cane", x: 500, y: 284 },
  { kind: "candy-cane", x: 520, y: 284 },
];

// ------------------------------------------------------------------ geometry

export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export function distToPolyline(p: Pt, pts: readonly Pt[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++)
    best = Math.min(best, distToSegment(p, pts[i]!, pts[i + 1]!));
  return best;
}

/** Signed: < 0 inside the road surface. */
export function roadDistance(p: Pt): number {
  let best = Infinity;
  for (const r of ROADS) best = Math.min(best, distToPolyline(p, r.pts) - r.w / 2);
  return best;
}

export function ellipseValue(p: Pt, e: { cx: number; cy: number; rx: number; ry: number }): number {
  return ((p[0] - e.cx) / e.rx) ** 2 + ((p[1] - e.cy) / e.ry) ** 2;
}

/** True where the ground is frozen water (river or pond), bridge deck excluded. */
export function isWater(p: Pt): boolean {
  if (inRect(p, BRIDGE.deck)) return false;
  return distToPolyline(p, RIVER.pts) < RIVER.w / 2 || ellipseValue(p, POND) < 1;
}

export const inRect = (p: Pt, r: Rect): boolean =>
  p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Building sprite rects (top-left + size) — sizes are passed in from sprite metadata. */
export type Sized = Record<BuildingId, readonly [number, number]>;

/** Anchors produced by the asset generator, in sprite pixels. */
export type BuildingMeta = {
  w: number;
  h: number;
  top: number;
  door: readonly [number, number];
  gift: readonly [number, number];
  smoke: readonly [number, number] | null;
};

/** Where Santa stands to knock: just in front of the door. */
export function doorStand(id: BuildingId, m: BuildingMeta): Pt {
  const b = BUILDINGS[id];
  return [b.x + m.door[0], b.y + m.door[1] + 7];
}

/**
 * Postcard framing in art pixels (×6 = 1080×1920). The served house's door
 * line sits on `doorRow`, so the paper card laid over the lower part (from
 * `cardTop`) never covers the door or the gift on the doorstep.
 */
export const POSTCARD = { w: 180, h: 320, doorRow: 158, cardTop: 194 } as const;

export function postcardFrame(id: BuildingId, m: BuildingMeta): Rect {
  const b = BUILDINGS[id];
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const left = clamp(Math.round(b.x + m.w / 2 - POSTCARD.w / 2), 0, WORLD.w - POSTCARD.w);
  const top = clamp(Math.round(b.y + m.door[1] - POSTCARD.doorRow), 0, WORLD.h - POSTCARD.h);
  return [left, top, POSTCARD.w, POSTCARD.h];
}

export const sizesOf = (meta: Record<BuildingId, BuildingMeta>): Sized =>
  Object.fromEntries(BUILDING_IDS.map((id) => [id, [meta[id].w, meta[id].h]])) as unknown as Sized;

/**
 * Deterministic pine forest: dense rows framing the map plus a few clusters,
 * kept off roads, water, buildings and each other.
 */
function scatterPines(sizes: Sized): Prop[] {
  const r = seeded(4242);
  const out: Prop[] = [];
  const taken: Array<[number, number, number]> = [];
  const clear = (x: number, y: number, rad: number) => {
    const p: Pt = [x, y];
    if (roadDistance(p) < rad + 6) return false;
    if (distToPolyline(p, RIVER.pts) < RIVER.w / 2 + rad + 4) return false;
    if (ellipseValue(p, { ...POND, rx: POND.rx + rad + 6, ry: POND.ry + rad + 4 }) < 1)
      return false;
    if (ellipseValue(p, { ...PLAZA, rx: PLAZA.rx + 18, ry: PLAZA.ry + 14 }) < 1) return false;
    if (Math.hypot(x - SLEIGH_PARK[0], y - SLEIGH_PARK[1]) < 70) return false;
    for (const id of BUILDING_IDS) {
      const b = BUILDINGS[id];
      const [w, h] = sizes[id];
      if (x > b.x - rad - 4 && x < b.x + w + rad + 4 && y > b.y + h * 0.3 && y < b.y + h + rad + 8)
        return false;
    }
    for (const lp of LAMPS) if (Math.hypot(x - lp.x - 4, y - lp.y - 30) < 14) return false;
    for (const hp of HAND_PROPS) if (Math.hypot(x - hp.x - 10, y - hp.y - 12) < 22) return false;
    for (const [tx, ty, tr] of taken)
      if (Math.hypot(x - tx, (y - ty) * 1.6) < (rad + tr) * 0.95) return false;
    return true;
  };
  const tryPlace = (x: number, y: number) => {
    const roll = r();
    const kind: PropKind = roll < 0.55 ? "pine-large" : roll < 0.88 ? "pine-small" : "pine-tiny";
    const k = PROP_KINDS[kind];
    const rad = k.w * 0.42;
    if (!clear(x, y, rad)) return;
    taken.push([x, y, rad]);
    out.push({ kind, x: Math.round(x - k.w / 2), y: Math.round(y - k.h + 2) });
  };
  // borders: north forest edge, west, east, south
  for (let i = 0; i < 900; i++) {
    const side = i % 4;
    const t = r();
    const depth = r();
    if (side === 0) tryPlace(10 + t * 1004, 208 + depth * 26);
    else if (side === 1) tryPlace(4 + depth * 34, 220 + t * 680);
    else if (side === 2) tryPlace(990 + depth * 34, 220 + t * 680);
    else tryPlace(10 + t * 1004, 864 + depth * 36);
  }
  // clusters that break up open snow
  const clusters: Array<[number, number, number]> = [
    [80, 300, 44],
    [300, 250, 40],
    [360, 590, 36],
    [140, 820, 60],
    [330, 800, 40],
    [700, 596, 28],
    [940, 560, 50],
    [960, 330, 30],
    [700, 240, 30],
    [610, 850, 40],
    [880, 840, 50],
    [420, 740, 26],
    [280, 520, 22],
  ];
  for (const [cx, cy, rad] of clusters)
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * rad;
      tryPlace(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7);
    }
  return out;
}

export function worldProps(sizes: Sized): Prop[] {
  return [...HAND_PROPS, ...scatterPines(sizes)];
}

/** Rectangles Santa can't walk through (world space). */
export function obstacles(sizes: Sized, props: readonly Prop[]): Rect[] {
  const rects: Rect[] = [];
  for (const id of BUILDING_IDS) {
    const b = BUILDINGS[id];
    rects.push([b.x + b.block[0], b.y + b.block[1], b.block[2], b.block[3]]);
  }
  rects.push([TREE.x + TREE.block[0], TREE.y + TREE.block[1], TREE.block[2], TREE.block[3]]);
  for (const lp of LAMPS) rects.push([lp.x + 2, lp.y + 25, 6, 5]);
  for (const p of props) {
    const b = PROP_KINDS[p.kind].block;
    if (b) rects.push([p.x + b[0], p.y + b[1], b[2], b[3]]);
  }
  // the parked sleigh team
  rects.push([SLEIGH_PARK[0] - 38, SLEIGH_PARK[1] - 8, 80, 10]);
  void sizes;
  return rects;
}
