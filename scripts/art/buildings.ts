// Buildings added for the explorable village. Same conventions as houses.ts:
// three aligned layers (base / lit / decor) plus anchors in sprite pixels.
import { Px, bayer, rng, type Color } from "../lib/px.ts";
import { C } from "../lib/palette.ts";
import * as P from "./parts.ts";
import * as D from "./decorations.ts";
import type { HouseArt } from "./houses.ts";

function layers(w: number, h: number) {
  return { base: new Px(w, h), lit: new Px(w, h), decor: new Px(w, h) };
}

function windows(base: Px, lit: Px, list: P.Win[]) {
  for (const w of list) {
    P.windowDark(base, w);
    P.windowLit(lit, w);
  }
}

/** Vertical planks inside a mask, painted in the given ramp (dark → light). */
function planks(
  px: Px,
  x0: number,
  y0: number,
  w: number,
  h: number,
  ramp: readonly [Color, Color, Color],
  inside: (x: number, y: number) => boolean = () => true,
) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      if (!inside(x, y)) continue;
      const u = (x - x0) % 5;
      let c = u === 4 ? ramp[0] : u === 0 ? ramp[2] : ramp[1];
      if (u === 2 && bayer(x, y) < 0.12) c = ramp[0];
      if (x === x0 + w - 1) c = ramp[0];
      px.set(x, y, c);
    }
}

/** Horizontal clapboard siding. */
function clapboard(
  px: Px,
  x0: number,
  y0: number,
  w: number,
  h: number,
  ramp: readonly [Color, Color, Color],
) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const v = (y - y0) % 4;
      let c = v === 0 ? ramp[2] : v === 3 ? ramp[0] : ramp[1];
      if (x >= x0 + w - 2 && v !== 0) c = ramp[0];
      px.set(x, y, c);
    }
}

/** Snowy roof band along a piecewise-linear top outline. */
function roofBand(
  px: Px,
  outline: (x: number) => number,
  x0: number,
  x1: number,
  th: number,
  ramp: readonly [Color, Color, Color, Color],
  snow: (x: number) => number,
  apexX: number,
) {
  for (let x = x0; x <= x1; x++) {
    const y = outline(x);
    const slope = Math.abs(outline(x + 1) - outline(x - 1)) / 2;
    const t = Math.round(th * Math.sqrt(1 + slope * slope));
    const left = x <= apexX;
    for (let k = 0; k < t; k++) {
      const yy = Math.round(y) + k;
      let c = k === t - 1 ? ramp[0] : (yy + (x % 2)) % 3 === 0 ? ramp[1] : left ? ramp[3] : ramp[2];
      if (k === 0) c = left ? ramp[3] : ramp[2];
      px.set(x, yy, c);
    }
    const s = snow(x);
    for (let k = 1; k <= s; k++)
      px.set(x, Math.round(y) - k, k === s ? (left ? C.snow6 : C.snow5) : left ? C.snow5 : C.snow4);
    px.set(x, Math.round(y), left ? C.snow4 : C.snow3);
  }
  // fill vertical gaps where the outline drops fast
  for (let x = x0; x <= x1 - 1; x++) {
    const a = Math.round(outline(x));
    const b = Math.round(outline(x + 1));
    if (Math.abs(a - b) <= 1) continue;
    const xs = a < b ? x : x + 1;
    for (let y = Math.min(a, b) - snow(xs); y < Math.max(a, b) - snow(xs); y++)
      if (!px.alphaAt(xs, y)) px.set(xs, y, xs <= apexX ? C.snow6 : C.snow5);
  }
}

const lerp = (pts: ReadonlyArray<readonly [number, number]>) => (x: number) => {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i]!;
    const [bx, by] = pts[i + 1]!;
    if (x <= bx || i + 2 === pts.length) return ay + ((by - ay) * (x - ax)) / (bx - ax);
  }
  return pts[0]![1];
};

// ------------------------------------------------------------------ Santa's workshop
export function workshop(): HouseArt {
  const r = rng(606);
  const { base, lit, decor } = layers(124, 96);
  P.castShadow(base, 70, 116, 92, 4);
  const outline = lerp([
    [6, 54],
    [21, 26],
    [62, 9],
    [103, 26],
    [118, 54],
  ]);
  // gable wall: red barn boards under the gambrel
  planks(base, 11, 14, 103, 77, [C.red1, C.red2, C.red3], (x, y) => y >= outline(x) + 4);
  base.hline(11, 113, 90, C.red0);
  // stovepipe on the right slope
  base.rect(95, 6, 4, 18, C.slate1);
  base.vline(95, 6, 23, C.slate3);
  base.rect(94, 4, 6, 2, C.slate2);
  base.hline(94, 99, 3, C.snow6);
  roofBand(base, outline, 4, 120, 4, P.SLATE, (x) => (x < 21 || x > 103 ? 1 : 3), 62);
  P.icicles(base, 6, 20, 55, r, 0.6);
  P.icicles(base, 104, 118, 55, r, 0.6);
  // hayloft door with a pulley beam
  base.rect(60, 16, 4, 3, C.wood1);
  base.hline(60, 63, 15, C.snow5);
  base.vline(62, 19, 24, C.outline);
  const loft: P.Win = {
    x: 54,
    y: 25,
    w: 17,
    h: 17,
    frame: C.ivory1,
    frameShade: C.ivory2,
    mullion: "cross",
    arch: true,
  };
  windows(base, lit, [loft]);
  // sign board with a gilded star
  base.rect(43, 46, 39, 8, C.wood1);
  base.rect(44, 47, 37, 6, C.wood3);
  base.hline(44, 80, 47, C.wood4);
  base.hline(43, 82, 45, C.snow5);
  base.map(59, 47, ["...a...", "..aba..", "aabbbaa", ".abbba.", ".a...a."], {
    a: C.gold1,
    b: C.gold3,
  });
  base.map(47, 48, ["xyx", "yyy", "xyx"], { x: C.red3, y: C.gold3 });
  base.map(75, 48, ["xyx", "yyy", "xyx"], { x: C.pine3, y: C.red3 });
  // the big doors stand open: warm workshop inside
  const dx0 = 45;
  const dx1 = 80;
  const dy0 = 57;
  for (let y = dy0; y < 90; y++)
    for (let x = dx0; x <= dx1; x++) {
      const t = (y - dy0) / 33;
      let c: Color = t < 0.25 ? C.lit1 : t < 0.7 ? C.lit2 : C.lit3;
      if (t < 0.12) c = C.lit0;
      if (bayer(x, y) < 0.2 && t > 0.3) c = C.lit3;
      base.set(x, y, c);
    }
  // shelves of presents and a workbench silhouette
  for (const sy of [63, 71]) {
    base.hline(dx0 + 2, dx1 - 2, sy, C.wood1);
    let x = dx0 + 3;
    const rr = rng(sy);
    while (x < dx1 - 5) {
      const w = 3 + Math.floor(rr() * 3);
      const h = 3 + Math.floor(rr() * 3);
      const pal = [C.red3, C.pine3, C.blue2, C.ivory1, C.gold2][Math.floor(rr() * 5)]!;
      base.rect(x, sy - h, w, h, pal);
      base.vline(x + Math.floor(w / 2), sy - h, sy - 1, C.gold3);
      x += w + 1;
    }
  }
  base.rect(dx0 + 6, 80, 24, 3, C.wood1);
  base.vline(dx0 + 8, 83, 89, C.wood0);
  base.vline(dx0 + 27, 83, 89, C.wood0);
  base.map(dx0 + 12, 75, ["..xx.", ".xyyx", "xyyyx"], { x: C.red2, y: C.red3 });
  // door frame + leaves swung open with white braces
  base.rect(dx0 - 2, dy0 - 2, dx1 - dx0 + 5, 2, C.ivory2);
  base.hline(dx0 - 2, dx1 + 2, dy0 - 3, C.snow5);
  for (const [lx, flip] of [
    [dx0 - 10, false],
    [dx1 + 3, true],
  ] as const) {
    base.rect(lx, dy0, 8, 33, C.red2);
    base.vline(flip ? lx + 7 : lx, dy0, dy0 + 32, C.red1);
    base.rect(lx, dy0, 8, 2, C.ivory1);
    base.rect(lx, dy0 + 31, 8, 2, C.ivory1);
    base.line(lx, dy0 + 2, lx + 7, dy0 + 30, C.ivory1);
    base.line(lx + 7, dy0 + 2, lx, dy0 + 30, C.ivory2);
  }
  // light spilling onto the snow
  for (let j = 0; j < 6; j++)
    for (let x = dx0 - 4 - j * 2; x <= dx1 + 4 + j * 2; x++)
      if (bayer(x, 91 + j) < 0.75 - j * 0.12) base.set(x, 91 + j, C.gold3, 0.35);
  base.blit(D.lantern(true), dx0 - 18, 60);
  base.blit(D.lantern(true), dx1 + 12, 60);
  P.drift(base, 8, 34, 92, 61);
  P.drift(base, 91, 117, 92, 62);
  P.lightPool(lit, 62, 34, 8, 2);
  // decor: wreath on the loft, garland over the doors, lights along the gambrel
  decor.blit(D.wreath(), 56, 28);
  D.garland(decor, dx0 - 2, dx1 + 2, dy0 - 1, 3, 31, { bows: true, bulbs: D.BULBS });
  const pts: Array<[number, number]> = [];
  for (let x = 10; x <= 114; x += 4) pts.push([x, Math.round(outline(x)) + 6]);
  D.lightString(decor, pts, D.WARM_BULBS, 2, 1);
  return { base, lit, decor, door: [62, 92], gift: [86, 93], smoke: [97, 2] };
}

// ------------------------------------------------------------------ chapel
export function chapel(): HouseArt {
  const r = rng(707);
  const { base, lit, decor } = layers(80, 138);
  P.castShadow(base, 46, 74, 134, 4);
  P.stones(base, 12, 74, 56, 60, r);
  const apexX = 39.5;
  const outer = (x: number) =>
    x <= apexX ? 76 - ((x - 6) / (apexX - 6)) * 30 : 76 - ((73 - x) / (73 - apexX)) * 30;
  // gable wall in stone, clipped to the triangle
  const gable = new Px(80, 138);
  P.stones(gable, 12, 46, 56, 30, r);
  for (let y = 46; y < 76; y++)
    for (let x = 12; x < 68; x++) if (y < outer(x) + 3) gable.erase(x, y);
  base.blit(gable, 0, 0);
  // bell tower rising from the ridge
  const tower = new Px(80, 138);
  P.stones(tower, 30, 20, 20, 32, r, [C.stone0, C.stone2, C.stone3, "#9aa5bb"]);
  base.blit(tower, 0, 0);
  base.vline(49, 20, 51, C.stone1);
  // belfry opening with a bell
  for (let y = 25; y < 39; y++)
    for (let x = 35; x <= 44; x++) {
      if (y < 27 && (x === 35 || x === 44)) continue;
      if (y < 26 && (x === 36 || x === 43)) continue;
      base.set(x, y, C.glass0);
    }
  base.map(37, 29, ["..aa..", ".abba.", ".abba.", "abbbba", "aaaaaa", "..c..."], {
    a: C.gold1,
    b: C.gold2,
    c: C.gold0,
  });
  base.rect(33, 39, 14, 2, C.stone3);
  base.hline(33, 46, 38, C.snow5);
  // cornice + spire with a star finial
  base.rect(28, 18, 24, 3, C.stone3);
  base.hline(28, 51, 17, C.snow5);
  base.hline(29, 50, 16, C.snow6);
  base.poly(
    [
      [39.5, 4],
      [28, 17],
      [51, 17],
    ],
    (x, y) => {
      const left = x + 0.5 < 39.5;
      const edge = left ? x < 39.5 - ((y - 4) * 11.5) / 13 + 2 : false;
      if (edge) return C.snow5;
      return (x + y) % 3 === 0 ? C.slate0 : left ? C.slate3 : C.slate1;
    },
  );
  base.map(37, 0, ["..a..", ".aba.", "aabaa", ".a.a."], { a: C.gold2, b: C.gold4 });
  P.gableRoof(base, {
    apexX,
    apexY: 46,
    xl: 6,
    xr: 73,
    eaveY: 76,
    th: 3,
    ramp: P.SLATE,
    snow: 2,
    trim: C.stone0,
    r,
  });
  // rose window, lancets, arched door
  const rose: P.Win = {
    x: 32,
    y: 54,
    w: 16,
    h: 16,
    frame: C.stone3,
    frameShade: C.stone1,
    round: true,
    mullion: "cross",
    sill: false,
  };
  const lancets: P.Win[] = [
    { x: 17, y: 86, w: 8, h: 20, frame: C.stone3, frameShade: C.stone1, mullion: "v", arch: true },
    { x: 55, y: 86, w: 8, h: 20, frame: C.stone3, frameShade: C.stone1, mullion: "v", arch: true },
  ];
  windows(base, lit, [rose, ...lancets]);
  // stained glass in the rose window
  const glass = [C.bulbRed, C.bulbGold, C.bulbBlue, C.bulbGreen];
  for (let y = 55; y < 69; y++)
    for (let x = 33; x < 47; x++) {
      const dx = x + 0.5 - 40;
      const dy = y + 0.5 - 62;
      const d = Math.hypot(dx, dy);
      if (d > 6.6 || Math.abs(dx) < 0.6 || Math.abs(dy) < 0.6) continue;
      const seg = (Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 8) + 8) % 4;
      lit.set(x, y, d < 2.4 ? C.lit4 : glass[seg]!);
    }
  const door: P.Door = {
    x: 33,
    y: 108,
    w: 14,
    h: 24,
    body: [C.wood1, C.wood2, C.wood3],
    frame: C.stone3,
    arch: true,
  };
  base.rect(31, 105, 18, 3, C.stone3);
  base.hline(31, 48, 104, C.snow5);
  P.door(base, door);
  lit.rect(36, 111, 8, 2, C.lit2);
  base.rect(29, 131, 22, 3, C.stone2);
  base.hline(29, 50, 131, C.snow5);
  P.drift(base, 8, 72, 134, 71);
  P.drift(base, 8, 72, 136, 72, 2);
  P.lightPool(lit, 21, 135, 6, 2);
  P.lightPool(lit, 59, 135, 6, 2);
  P.lightPool(lit, 40, 136, 8, 2);
  // decor: wreath, door garland, lights along the gable, candles in the lancets
  decor.blit(D.wreath(), 33, 111);
  D.garland(decor, 31, 48, 106, 2, 33, { bows: true });
  const pts: Array<[number, number]> = [];
  for (let x = 8; x <= 71; x += 3) pts.push([x, Math.round(outer(x)) + 4]);
  D.lightString(decor, pts, [C.bulbGold, C.bulbWhite], 2, 0);
  for (const w of lancets) D.candle(decor, w.x + 2, w.y + w.h - 9);
  return { base, lit, decor, door: [40, 134], gift: [52, 135], smoke: [-1, -1] };
}

// ------------------------------------------------------------------ tea house
export function teaHouse(): HouseArt {
  const r = rng(808);
  const { base, lit, decor } = layers(84, 84);
  P.castShadow(base, 54, 76, 80, 4);
  clapboard(base, 8, 32, 64, 47, [C.blue0, C.blue1, C.blue2]);
  // corner boards
  base.rect(8, 32, 2, 47, C.ivory1);
  base.rect(70, 32, 2, 47, C.ivory2);
  base.rect(8, 55, 64, 2, C.ivory1);
  base.hline(8, 71, 56, C.ivory2);
  P.chimney(base, 58, 3, 7, 16, r, "brick");
  P.trapRoof(base, {
    x0: 3,
    x1: 76,
    eaveY: 32,
    ridgeY: 11,
    inset: 7,
    ramp: P.SLATE,
    snow: 6,
    r,
    seed: 8,
    mound: 2,
  });
  // two little dormers
  for (const ox of [18, 46]) {
    P.plaster(base, ox, 19, 12, 12, r, [C.blue0, C.blue1, C.blue2, C.blue3]);
    P.gableRoof(base, {
      apexX: ox + 5.5,
      apexY: 13,
      xl: ox - 2,
      xr: ox + 13,
      eaveY: 20,
      th: 2,
      ramp: P.SLATE,
      snow: 2,
      r,
    });
  }
  const dormers: P.Win[] = [18, 46].map((ox) => ({
    x: ox + 2,
    y: 22,
    w: 8,
    h: 8,
    frame: C.ivory1,
    frameShade: C.ivory2,
    mullion: "cross",
    sill: false,
  }));
  const upper: P.Win[] = [
    { x: 15, y: 36, w: 11, h: 12, frame: C.ivory1, frameShade: C.ivory2, mullion: "cross" },
    { x: 53, y: 36, w: 11, h: 12, frame: C.ivory1, frameShade: C.ivory2, mullion: "cross" },
  ];
  const bay: P.Win = {
    x: 12,
    y: 59,
    w: 28,
    h: 15,
    frame: C.ivory1,
    frameShade: C.ivory2,
    mullion: "grid",
    curtains: false,
  };
  windows(base, lit, [...dormers, ...upper, bay]);
  // window boxes upstairs
  for (const w of upper) {
    base.rect(w.x - 1, w.y + w.h + 1, w.w + 2, 2, C.wood2);
    base.hline(w.x - 1, w.x + w.w, w.y + w.h + 2, C.wood1);
  }
  // teapots and cups on the lit counter
  lit.hline(13, 38, 71, C.wood2);
  lit.map(
    15,
    66,
    [
      ".aaa......bb.....aaa...",
      "aaaaa.c..bbbb...aaaaa.c",
      "aaaaac...bbbb...aaaaac.",
      ".aaa......bb.....aaa..",
    ],
    { a: C.ivory, b: C.red3, c: C.ivory1 },
  );
  // door with a transom and a little canopy
  const door: P.Door = {
    x: 48,
    y: 61,
    w: 11,
    h: 17,
    body: [C.pine1, C.pine2, C.pine3],
    frame: C.ivory1,
    window: true,
  };
  P.door(base, door);
  P.doorLit(lit, door);
  P.gableRoof(base, {
    apexX: 53.5,
    apexY: 56,
    xl: 45,
    xr: 62,
    eaveY: 60,
    th: 2,
    ramp: P.SLATE,
    snow: 1,
    r,
  });
  const side: P.Win = {
    x: 63,
    y: 61,
    w: 6,
    h: 10,
    frame: C.ivory1,
    frameShade: C.ivory2,
    mullion: "v",
  };
  windows(base, lit, [side]);
  // hanging teacup sign
  base.hline(71, 80, 40, C.outline);
  base.vline(73, 41, 42, C.outline);
  base.vline(79, 41, 42, C.outline);
  base.rect(71, 43, 11, 9, C.wood1);
  base.rect(72, 44, 9, 7, C.ivory1);
  base.map(73, 45, [".a.a..", "bbbb..", "bbbbbc", ".bb..."], { a: C.snow3, b: C.red3, c: C.red3 });
  base.hline(71, 81, 42, C.snow5);
  base.rect(46, 78, 15, 2, C.stone2);
  base.hline(46, 60, 78, C.snow5);
  P.drift(base, 4, 76, 80, 81);
  P.drift(base, 4, 76, 82, 82, 2);
  P.lightPool(lit, 26, 81, 12, 2);
  P.lightPool(lit, 54, 81, 6, 2);
  // decor: bay garland with bulbs, wreath, a small tree in the bay, eave lights
  D.garland(decor, 11, 40, 58, 2, 41, { bows: true, bulbs: D.BULBS });
  decor.blit(D.wreath(), 47, 64);
  const tree = new Px(9, 12);
  tree.map(
    0,
    0,
    [
      "....a....",
      "...bcb...",
      "..bcbcb..",
      "...bcb...",
      "..bcbcb..",
      ".bcbcbcb.",
      "bcbcbcbcb",
      "....d....",
    ],
    {
      a: C.gold4,
      b: C.pine2,
      c: C.pine4,
      d: C.wood2,
    },
  );
  decor.blit(tree, 30, 63);
  D.lightString(
    decor,
    [
      [4, 33],
      [76, 33],
    ],
    D.BULBS,
    3,
    1,
  );
  return { base, lit, decor, door: [53, 79], gift: [42, 80], smoke: [61, 2] };
}

// ------------------------------------------------------------------ A-frame cabin
export function aFrame(): HouseArt {
  const r = rng(909);
  const { base, lit, decor } = layers(78, 80);
  P.castShadow(base, 46, 74, 76, 4);
  const apexX = 38.5;
  const roof = (x: number) =>
    x <= apexX ? 72 - ((x - 2) / (apexX - 2)) * 66 : 72 - ((75 - x) / (75 - apexX)) * 66;
  // gable wall: boards inside the A
  planks(base, 8, 10, 62, 64, [C.wood1, C.wood2, C.wood3], (x, y) => y >= roof(x) + 6);
  // big triangular window up top
  const tri = (x: number, y: number) => y >= 22 + Math.abs(x + 0.5 - apexX) * 1.75 && y < 47;
  for (let y = 20; y < 48; y++)
    for (let x = 22; x < 56; x++) {
      if (!tri(x, y)) continue;
      const edge = !tri(x - 1, y) || !tri(x + 1, y) || !tri(x, y - 1) || !tri(x, y + 1);
      if (edge) {
        base.set(x, y, x < apexX ? C.wood4 : C.wood3);
        continue;
      }
      const mull = x + 0.5 === apexX + 0.5 || x === Math.floor(apexX) || y === 36;
      base.set(x, y, mull ? C.wood3 : (x + y) % 9 === 0 ? C.glass2 : C.glass1);
      if (!mull) {
        const t = (y - 22) / 25;
        lit.set(x, y, t < 0.35 ? C.lit4 : t < 0.7 ? C.lit3 : C.lit2);
      } else lit.set(x, y, C.wood2);
    }
  // ground floor: door between two windows
  const wins: P.Win[] = [
    { x: 16, y: 54, w: 9, h: 10, frame: C.wood4, frameShade: C.wood1, mullion: "cross" },
    { x: 52, y: 54, w: 9, h: 10, frame: C.wood4, frameShade: C.wood1, mullion: "cross" },
  ];
  windows(base, lit, wins);
  const door: P.Door = {
    x: 33,
    y: 52,
    w: 11,
    h: 19,
    body: [C.red1, C.red2, C.red3],
    frame: C.wood4,
    window: true,
  };
  P.door(base, door);
  P.doorLit(lit, door);
  // the roof sweeps down to the snow on both sides
  roofBand(base, roof, 1, 76, 6, P.SHINGLE, (x) => (Math.abs(x - apexX) < 30 ? 4 : 3), apexX);
  // stovepipe through the right slope
  base.rect(59, 18, 3, 12, C.slate1);
  base.vline(59, 18, 29, C.slate3);
  base.rect(58, 16, 5, 2, C.slate2);
  base.hline(58, 62, 15, C.snow6);
  // deck with railing
  base.rect(10, 71, 58, 3, C.wood2);
  base.hline(10, 67, 71, C.wood4);
  base.hline(10, 67, 73, C.wood1);
  base.hline(10, 67, 70, C.snow5);
  for (const x of [12, 20, 28, 49, 57, 65]) {
    base.vline(x, 63, 70, C.wood3);
    base.set(x, 62, C.snow6);
  }
  base.hline(12, 29, 64, C.wood3);
  base.hline(48, 65, 64, C.wood3);
  base.hline(12, 29, 63, C.snow5);
  base.hline(48, 65, 63, C.snow5);
  P.drift(base, 3, 75, 76, 91);
  P.drift(base, 3, 75, 78, 92, 2);
  P.lightPool(lit, 38, 76, 10, 2);
  P.lightPool(lit, 20, 75, 6, 2);
  P.lightPool(lit, 56, 75, 6, 2);
  // decor: lights tracing the A, star in the big window, wreath, deck garland
  const pts: Array<[number, number]> = [];
  for (let x = 6; x <= 71; x += 3) pts.push([x, Math.round(roof(x)) + 8]);
  D.lightString(decor, pts, [C.bulbRed, C.bulbGold, C.bulbGreen], 2, 0);
  decor.map(35, 25, ["...a...", "..aba..", "aabbbaa", ".abbba.", ".a...a."], {
    a: C.gold3,
    b: C.gold4,
  });
  decor.blit(D.wreath(), 32, 55);
  D.garland(decor, 12, 29, 64, 1, 93, { bows: true });
  D.garland(decor, 48, 65, 64, 1, 94, { bows: true });
  void r;
  return { base, lit, decor, door: [38, 75], gift: [26, 76], smoke: [60, 14] };
}

// ------------------------------------------------------------------ woodshed
export function shed(): HouseArt {
  const r = rng(1010);
  const { base, lit, decor } = layers(52, 48);
  P.castShadow(base, 30, 46, 44, 3);
  planks(base, 8, 20, 34, 24, [C.wood1, C.wood2, C.wood3]);
  P.gableRoof(base, {
    apexX: 25,
    apexY: 6,
    xl: 3,
    xr: 47,
    eaveY: 22,
    th: 3,
    ramp: P.SHINGLE,
    snow: 3,
    trim: C.wood1,
    r,
  });
  const inside = (x: number, y: number) => y >= 9 + Math.abs(x + 0.5 - 25) * 0.6 && y < 22;
  planks(base, 9, 8, 32, 14, [C.wood1, C.wood2, C.wood3], inside);
  // door
  base.rect(20, 27, 11, 17, C.wood1);
  base.rect(21, 28, 9, 16, C.wood3);
  base.line(21, 28, 29, 43, C.wood1);
  base.set(28, 36, C.gold2);
  // firewood stack along the left wall
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 3; i++)
      base.map(1 + i * 3 + (row % 2), 41 - row * 3, [".a.", "aba", ".a."], {
        a: C.wood4,
        b: C.wood2,
      });
  base.hline(1, 10, 32, C.snow5);
  // a sled leaning on the right wall
  base.line(43, 26, 48, 43, C.red2);
  base.line(44, 26, 49, 43, C.red3);
  base.line(42, 30, 46, 44, C.gold1);
  base.hline(42, 45, 25, C.snow5);
  P.drift(base, 2, 50, 44, 101);
  P.drift(base, 2, 50, 46, 102, 2);
  void lit;
  void decor;
  return { base, lit, decor, door: [25, 45], gift: [14, 46], smoke: [-1, -1] };
}

// ------------------------------------------------------------------ props

export function bench(): Px {
  const px = new Px(24, 15);
  const iron = "#1f2433";
  // backrest + seat slats
  for (const y of [1, 4]) {
    px.hline(2, 21, y, C.wood3);
    px.hline(2, 21, y + 1, C.wood1);
  }
  px.hline(2, 21, 0, C.snow5);
  px.rect(1, 8, 22, 2, C.wood3);
  px.hline(1, 22, 10, C.wood1);
  px.hline(1, 22, 7, C.snow6);
  px.hline(2, 21, 8, C.snow5);
  for (const x of [3, 20]) {
    px.vline(x, 0, 14, iron);
    px.set(x + 1, 13, iron);
  }
  px.ellipse(12, 14, 11, 1.2, C.snow1, 0.4);
  return px;
}

export function signpost(): Px {
  const px = new Px(22, 26);
  px.rect(10, 4, 3, 21, C.wood2);
  px.vline(10, 4, 24, C.wood3);
  px.map(1, 4, ["aaaaaaaaab.", "abbbbbbbbbc", "aaaaaaaaab."], {
    a: C.wood4,
    b: C.wood3,
    c: C.wood2,
  });
  px.map(10, 11, [".baaaaaaaa", "cbbbbbbbba", ".baaaaaaaa"], {
    a: C.wood4,
    b: C.wood3,
    c: C.wood2,
  });
  px.hline(1, 10, 3, C.snow5);
  px.hline(11, 19, 10, C.snow5);
  px.hline(10, 12, 3, C.snow6);
  px.ellipse(11.5, 24.5, 5, 1.4, C.snow5);
  return px;
}

export function crates(): Px {
  const px = new Px(30, 22);
  const crate = (x: number, y: number, w: number, h: number) => {
    px.rect(x, y, w, h, C.wood2);
    px.rect(x + 1, y + 1, w - 2, h - 2, C.wood3);
    px.line(x + 1, y + 1, x + w - 2, y + h - 2, C.wood2);
    px.hline(x, x + w - 1, y, C.snow5);
    px.vline(x + w - 1, y + 1, y + h - 1, C.wood1);
  };
  crate(1, 10, 12, 11);
  crate(12, 12, 11, 9);
  crate(5, 2, 10, 9);
  // a parcel waiting on top
  px.map(17, 6, [".ab..", "xxbxx", "xxbxx", "bbbbb", "xxbxx"], {
    a: C.gold4,
    b: C.gold3,
    x: C.red3,
  });
  px.ellipse(15, 21, 14, 1.2, C.snow1, 0.35);
  return px;
}

/** Wooden footbridge in three layers: deck (ground), back rail, front rail. */
export function bridge(): { deck: Px; back: Px; front: Px } {
  const W = 48;
  const H = 34;
  const deck = new Px(W, H);
  const back = new Px(W, H);
  const front = new Px(W, H);
  // deck planks run across the direction of travel
  for (let y = 9; y < 30; y++)
    for (let x = 2; x < W - 2; x++) {
      const u = x % 4;
      let c: Color = u === 3 ? C.wood1 : u === 0 ? C.wood4 : C.wood3;
      if (y === 29) c = C.wood0;
      if (y === 28) c = C.wood1;
      deck.set(x, y, c);
    }
  // snow along the edges, trodden in the middle
  for (let x = 2; x < W - 2; x++) {
    deck.set(x, 9, C.snow5);
    deck.set(x, 10, bayer(x, 10) < 0.6 ? C.snow4 : C.wood4);
    deck.set(x, 27, bayer(x, 27) < 0.5 ? C.snow4 : C.wood3);
  }
  // rails: posts + top beam with snow
  const rail = (px: Px, y: number) => {
    for (const x of [2, 13, 24, 35, 45]) {
      px.rect(x, y - 7, 2, 8, C.wood2);
      px.vline(x, y - 7, y, C.wood4);
      px.set(x, y - 8, C.snow6);
      px.set(x + 1, y - 8, C.snow5);
    }
    px.hline(1, W - 2, y - 6, C.wood3);
    px.hline(1, W - 2, y - 5, C.wood1);
    px.hline(1, W - 2, y - 7, C.snow5);
    px.hline(1, W - 2, y - 2, C.wood2);
  };
  rail(back, 9);
  rail(front, 31);
  return { deck, back, front };
}

/** Fence running north–south, seen from the side of its posts. */
export function fenceSide(len: number): Px {
  const px = new Px(6, len + 8);
  for (let y = 0; y < len; y += 9) {
    px.rect(2, y, 3, 9, C.wood3);
    px.vline(2, y, y + 8, C.wood4);
    px.vline(4, y, y + 8, C.wood1);
    px.hline(2, 4, y, C.snow6);
  }
  px.vline(1, 2, len + 2, C.wood2);
  px.vline(5, 3, len + 3, C.wood1);
  px.vline(0, 1, len + 1, C.snow5);
  return px;
}

/** Soft additive glow with stepped (pixel) falloff. */
export function glow(radius: number, color: Color): Px {
  const size = radius * 2;
  const px = new Px(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - radius, y + 0.5 - radius) / radius;
      if (d >= 1) continue;
      const a = Math.round((1 - d) ** 1.6 * 6) / 6;
      if (a <= 0) continue;
      px.set(x, y, color, a * 0.85);
    }
  return px;
}

/** Ground shadow ellipse (drawn at low alpha under characters and the sleigh). */
export function shadow(w: number, h: number): Px {
  const px = new Px(w, h);
  px.ellipse(w / 2, h / 2, w / 2, h / 2, C.snow0, 0.55);
  px.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 1, C.snow0, 0.35);
  return px;
}

export function footprints(): { v: Px; h: Px } {
  const v = new Px(2, 3);
  v.map(0, 0, ["ab", "aa", "ab"], { a: C.snow1, b: C.snow2 });
  const h = new Px(3, 2);
  h.map(0, 0, ["aab", "aaa"], { a: C.snow1, b: C.snow2 });
  return { v, h };
}

export function tapRing(): Px {
  const px = new Px(11, 7);
  px.map(
    0,
    0,
    [
      "...aaaaa...",
      ".aa.....aa.",
      "a.........a",
      "a.........a",
      "a.........a",
      ".aa.....aa.",
      "...aaaaa...",
    ],
    {
      a: C.gold3,
    },
  );
  return px;
}

/** Copy with exact palette colours swapped (blended pixels are left alone). */
export function recolor(src: Px, swaps: Readonly<Record<string, string>>): Px {
  const out = new Px(src.w, src.h);
  out.data.set(src.data);
  const table = new Map(Object.entries(swaps).map(([a, b]) => [a.toLowerCase(), b]));
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const hex =
      "#" + [d[i]!, d[i + 1]!, d[i + 2]!].map((v) => v.toString(16).padStart(2, "0")).join("");
    const to = table.get(hex);
    if (!to) continue;
    const n = parseInt(to.slice(1, 7), 16);
    d[i] = (n >> 16) & 255;
    d[i + 1] = (n >> 8) & 255;
    d[i + 2] = n & 255;
  }
  return out;
}

const variant = (art: HouseArt, swaps: Record<string, string>): HouseArt => ({
  ...art,
  base: recolor(art.base, swaps),
});

/** Neighbours' houses: recoloured cottages that wake up when the tree lights. */
export function blueCottage(make: () => HouseArt): HouseArt {
  return variant(make(), {
    [C.red0]: C.blue0,
    [C.red1]: C.blue1,
    [C.red2]: C.blue2,
    [C.red3]: C.blue3,
    [C.pine1]: C.red1,
    [C.pine2]: C.red2,
    [C.pine3]: C.red3,
  });
}

export function roseCottage(make: () => HouseArt): HouseArt {
  return variant(make(), {
    [C.slate0]: C.red0,
    [C.slate1]: C.red1,
    [C.slate2]: C.red2,
    [C.red1]: C.pine1,
    [C.red2]: C.pine2,
  });
}
