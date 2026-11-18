// The five village houses. Each returns three aligned layers of identical size:
//   base  – the building at night (windows dark)
//   lit   – warm window light, lanterns, light pooling on snow
//   decor – Christmas decorations unique to that house
// plus anchors (in sprite pixels) for the doorstep gift and chimney smoke.
import { Px, rng } from "../lib/px.ts";
import { C } from "../lib/palette.ts";
import * as P from "./parts.ts";
import * as D from "./decorations.ts";

export type HouseArt = {
  base: Px;
  lit: Px;
  decor: Px;
  door: [number, number];
  gift: [number, number];
  smoke: [number, number];
};

function layers(w: number, h: number) {
  return { base: new Px(w, h), lit: new Px(w, h), decor: new Px(w, h) };
}

function windows(base: Px, lit: Px, list: P.Win[]) {
  for (const w of list) {
    P.windowDark(base, w);
    P.windowLit(lit, w);
  }
}

function candlesIn(decor: Px, list: P.Win[]) {
  for (const w of list) D.candle(decor, w.x + Math.floor(w.w / 2) - 1, w.y + w.h - 9);
}

// ------------------------------------------------------------------ 1
export function redCottage(): HouseArt {
  const r = rng(101);
  const { base, lit, decor } = layers(76, 66);
  P.castShadow(base, 46, 64, 62, 4);
  P.plaster(base, 9, 33, 54, 25, r);
  P.stones(base, 9, 57, 54, 5, r);
  base.hline(9, 62, 33, C.plaster0);
  base.hline(9, 62, 34, C.plaster1);
  P.chimney(base, 52, 3, 6, 16, r, "brick");
  P.trapRoof(base, {
    x0: 3,
    x1: 68,
    eaveY: 33,
    ridgeY: 11,
    inset: 10,
    ramp: P.RED_TILES,
    snow: 8,
    r,
    seed: 1,
  });
  // dormer
  P.plaster(base, 31, 19, 11, 12, r);
  P.gableRoof(base, {
    apexX: 36,
    apexY: 13,
    xl: 29,
    xr: 43,
    eaveY: 20,
    th: 2,
    ramp: P.RED_TILES,
    snow: 2,
    r,
  });
  base.hline(30, 42, 31, C.snow5);
  base.hline(29, 43, 32, C.snow4);
  const dormer: P.Win = {
    x: 33,
    y: 22,
    w: 7,
    h: 8,
    frame: C.ivory1,
    frameShade: C.ivory2,
    mullion: "cross",
    arch: true,
    sill: false,
  };
  const wins: P.Win[] = [
    {
      x: 14,
      y: 40,
      w: 11,
      h: 11,
      frame: C.ivory1,
      frameShade: C.ivory2,
      shutters: [C.pine1, C.pine2],
    },
    {
      x: 47,
      y: 40,
      w: 11,
      h: 11,
      frame: C.ivory1,
      frameShade: C.ivory2,
      shutters: [C.pine1, C.pine2],
    },
  ];
  windows(base, lit, [...wins, dormer]);
  // door with a little tiled canopy
  const door: P.Door = {
    x: 32,
    y: 44,
    w: 8,
    h: 17,
    body: [C.pine1, C.pine2, C.pine3],
    frame: C.wood1,
    arch: true,
    window: true,
  };
  P.door(base, door);
  P.doorLit(lit, door);
  P.gableRoof(base, {
    apexX: 35.5,
    apexY: 38,
    xl: 29,
    xr: 42,
    eaveY: 42,
    th: 2,
    ramp: P.RED_TILES,
    snow: 1,
    r,
  });
  base.rect(29, 61, 14, 2, C.stone2);
  base.hline(29, 42, 61, C.snow5);
  base.blit(D.lantern(false), 42, 44);
  lit.blit(D.lantern(true), 42, 44);
  P.drift(base, 5, 66, 63, 11);
  P.drift(base, 5, 66, 65, 12, 2);
  P.lightPool(lit, 19, 63, 7, 2);
  P.lightPool(lit, 52, 63, 7, 2);
  P.lightPool(lit, 36, 64, 6, 2);
  // decor: eave garland with bows and coloured bulbs, door wreath, window candles
  D.garland(decor, 3, 35, 35, 3, 1, { bows: true, bulbs: D.BULBS });
  D.garland(decor, 36, 68, 35, 3, 2, { bows: true, bulbs: D.BULBS });
  decor.blit(D.wreath(), 29, 46);
  candlesIn(decor, wins);
  D.lightString(
    decor,
    [
      [30, 21],
      [36, 14],
      [42, 21],
    ],
    [C.bulbGold],
    2,
    0,
  );
  return { base, lit, decor, door: [36, 62], gift: [48, 64], smoke: [55, 2] };
}

// ------------------------------------------------------------------ 2
export function woodlandCabin(): HouseArt {
  const r = rng(202);
  const { base, lit, decor } = layers(80, 66);
  P.castShadow(base, 50, 72, 62, 4);
  P.logs(base, 11, 33, 56, 29, r);
  // gable wall: vertical boards inside the roof triangle
  const apexX = 38.5;
  const outer = (x: number) =>
    x <= apexX ? 34 - ((x - 3) / (apexX - 3)) * 31 : 34 - ((75 - x) / (75 - apexX)) * 31;
  P.boards(base, 11, 6, 56, 27, (x, y) => y >= outer(x) + 3);
  P.gableRoof(base, {
    apexX,
    apexY: 3,
    xl: 3,
    xr: 75,
    eaveY: 34,
    th: 4,
    ramp: P.SHINGLE,
    snow: 3,
    trim: C.wood3,
    r,
  });
  const attic: P.Win = {
    x: 34,
    y: 14,
    w: 10,
    h: 10,
    frame: C.wood4,
    frameShade: C.wood2,
    round: true,
    mullion: "cross",
    sill: false,
  };
  const wins: P.Win[] = [
    { x: 14, y: 42, w: 9, h: 11, frame: C.wood4, frameShade: C.wood1, mullion: "cross" },
    { x: 56, y: 42, w: 9, h: 11, frame: C.wood4, frameShade: C.wood1, mullion: "cross" },
  ];
  windows(base, lit, [...wins, attic]);
  // tall external stone chimney on the right
  P.stones(base, 67, 14, 7, 48, r);
  base.rect(66, 12, 9, 2, C.stone1);
  base.hline(66, 74, 12, C.stone3);
  base.rect(66, 10, 9, 2, C.snow5);
  base.hline(67, 73, 9, C.snow6);
  base.rect(68, 10, 5, 1, C.outline);
  // door + porch
  const door: P.Door = {
    x: 34,
    y: 42,
    w: 9,
    h: 17,
    body: [C.wood1, C.wood2, C.wood3],
    frame: C.wood0,
    window: true,
  };
  P.door(base, door);
  P.doorLit(lit, door);
  for (const px of [24, 52]) {
    base.rect(px, 40, 2, 20, C.wood3);
    base.vline(px + 1, 40, 59, C.wood1);
  }
  // railings
  for (const [a, b] of [
    [26, 33],
    [44, 51],
  ] as const) {
    base.hline(a, b, 52, C.wood3);
    base.hline(a, b, 51, C.snow5);
    for (let x = a; x <= b; x += 2) base.vline(x, 53, 58, C.wood2);
  }
  base.rect(20, 59, 38, 3, C.wood2);
  base.hline(20, 57, 59, C.wood4);
  base.hline(20, 57, 61, C.wood1);
  P.trapRoof(base, {
    x0: 21,
    x1: 56,
    eaveY: 40,
    ridgeY: 36,
    inset: 2,
    ramp: P.SHINGLE,
    snow: 2,
    r,
    seed: 3,
    mound: 1,
  });
  // firewood stack
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 3 - (row === 2 ? 1 : 0); i++)
      base.map(1 + i * 3 + (row === 2 ? 1 : 0), 58 - row * 3, [".a.", "aba", ".a."], {
        a: C.wood4,
        b: C.wood2,
      });
  base.hline(2, 9, 51, C.snow6);
  base.hline(1, 10, 52, C.snow5);
  base.blit(D.lantern(false), 45, 41);
  lit.blit(D.lantern(true), 45, 41);
  P.drift(base, 0, 77, 63, 21);
  P.drift(base, 0, 77, 65, 22, 2);
  P.lightPool(lit, 18, 63, 6, 2);
  P.lightPool(lit, 60, 63, 6, 2);
  P.lightPool(lit, 38, 63, 9, 2);
  // decor: warm lights along both roof slopes, porch garland, wreath, post bows
  const pts: Array<[number, number]> = [];
  for (let x = 6; x <= 72; x += 4) pts.push([x, Math.round(outer(x)) + 5]);
  D.lightString(decor, pts, D.WARM_BULBS, 3, 1);
  D.garland(decor, 21, 56, 41, 2, 4, { bows: true });
  decor.blit(D.wreath(), 32, 44);
  D.bow(decor, 25, 45);
  D.bow(decor, 53, 45);
  candlesIn(decor, wins);
  return { base, lit, decor, door: [38, 62], gift: [29, 60], smoke: [70, 8] };
}

// ------------------------------------------------------------------ 3
export function townhouse(): HouseArt {
  const r = rng(303);
  const { base, lit, decor } = layers(62, 108);
  P.castShadow(base, 40, 56, 104, 4);
  P.stones(base, 8, 77, 46, 27, r);
  // two jettied half-timbered floors
  P.plaster(base, 7, 57, 48, 19, r);
  P.plaster(base, 6, 37, 50, 19, r);
  const beam = (x: number, y: number, w: number, h: number) => {
    base.rect(x, y, w, h, C.wood1);
    if (w > h) base.hline(x, x + w - 1, y, C.wood2);
    else base.vline(x, y, y + h - 1, C.wood2);
  };
  const apexX = 30.5;
  const outer = (x: number) =>
    x <= apexX ? 38 - ((x - 2) / (apexX - 2)) * 34 : 38 - ((59 - x) / (59 - apexX)) * 34;
  P.plaster(base, 6, 6, 50, 31, r);
  // clear plaster outside the gable triangle
  for (let y = 0; y < 37; y++) for (let x = 0; x < 62; x++) if (y < outer(x) + 3) base.erase(x, y);
  P.chimney(base, 44, 7, 6, 18, r, "brick");
  // timber frame
  for (const [y0, y1, x0, x1] of [
    [37, 55, 6, 55],
    [57, 75, 7, 54],
  ] as const) {
    beam(x0, y0, x1 - x0 + 1, 2);
    beam(x0, y1 - 1, x1 - x0 + 1, 2);
    for (const x of [x0, 10, 22, 39, 51, x1 - 1]) beam(x, y0, 2, y1 - y0);
    // St Andrew's crosses in the centre panel
    base.line(24, y0 + 2, 37, y1 - 2, C.wood1);
    base.line(37, y0 + 2, 24, y1 - 2, C.wood1);
    base.line(25, y0 + 2, 38, y1 - 2, C.wood2);
  }
  beam(5, 55, 52, 2);
  beam(6, 75, 50, 2);
  // gable timbers
  beam(29, 12, 2, 25);
  base.line(12, 36, 29, 18, C.wood1);
  base.line(49, 36, 31, 18, C.wood1);
  P.gableRoof(base, {
    apexX,
    apexY: 4,
    xl: 2,
    xr: 59,
    eaveY: 38,
    th: 3,
    ramp: P.SLATE,
    snow: 2,
    trim: C.wood1,
    r,
  });
  const top: P.Win[] = [
    { x: 12, y: 40, w: 9, h: 12, frame: C.ivory1, frameShade: C.ivory2, mullion: "cross" },
    { x: 41, y: 40, w: 9, h: 12, frame: C.ivory1, frameShade: C.ivory2, mullion: "cross" },
  ];
  const mid: P.Win[] = [
    { x: 12, y: 60, w: 9, h: 12, frame: C.ivory1, frameShade: C.ivory2, mullion: "cross" },
    { x: 41, y: 60, w: 9, h: 12, frame: C.ivory1, frameShade: C.ivory2, mullion: "cross" },
  ];
  const ground: P.Win[] = [
    { x: 12, y: 84, w: 9, h: 13, frame: C.stone3, frameShade: C.stone1, mullion: "v", arch: true },
    { x: 41, y: 84, w: 9, h: 13, frame: C.stone3, frameShade: C.stone1, mullion: "v", arch: true },
  ];
  const attic: P.Win = {
    x: 26,
    y: 20,
    w: 9,
    h: 9,
    frame: C.ivory1,
    frameShade: C.ivory2,
    round: true,
    mullion: "cross",
    sill: false,
  };
  windows(base, lit, [...top, ...mid, ...ground, attic]);
  // window boxes on the middle floor
  for (const w of mid) {
    base.rect(w.x - 1, w.y + w.h + 1, w.w + 2, 2, C.wood2);
    base.hline(w.x - 1, w.x + w.w, w.y + w.h + 2, C.wood1);
  }
  const door: P.Door = {
    x: 25,
    y: 84,
    w: 12,
    h: 20,
    body: [C.red0, C.red1, C.red2],
    frame: C.stone3,
    arch: true,
    window: true,
  };
  // stone arch around the door
  base.rect(23, 81, 16, 3, C.stone3);
  base.hline(24, 37, 80, C.snow5);
  P.door(base, door);
  P.doorLit(lit, door);
  base.rect(22, 103, 18, 2, C.stone2);
  base.hline(22, 39, 103, C.snow5);
  P.drift(base, 5, 57, 105, 31);
  P.drift(base, 5, 57, 107, 32, 2);
  for (const w of [...ground]) P.lightPool(lit, w.x + 4, 105, 6, 2);
  P.lightPool(lit, 31, 106, 7, 2);
  // decor: window-box greenery, lights on the gable, star lanterns, wreath
  for (const w of mid)
    D.garland(decor, w.x - 1, w.x + w.w, w.y + w.h + 1, 0, 5 + w.x, {
      bulbs: [C.bulbRed, C.bulbGold],
    });
  const pts: Array<[number, number]> = [];
  for (let x = 5; x <= 56; x += 3) pts.push([x, Math.round(outer(x)) + 4]);
  D.lightString(decor, pts, [C.bulbGold, C.bulbRed], 2, 0);
  for (const w of top)
    decor.map(w.x + 2, w.y + 3, ["..a..", ".aba.", "aabaa", ".a.a."], { a: C.gold3, b: C.gold4 });
  decor.blit(D.wreath(), 25, 87);
  return { base, lit, decor, door: [31, 104], gift: [46, 106], smoke: [47, 6] };
}

// ------------------------------------------------------------------ 4
export function bakery(): HouseArt {
  const r = rng(404);
  const { base, lit, decor } = layers(86, 72);
  P.castShadow(base, 56, 78, 68, 4);
  P.bricks(base, 7, 30, 70, 38, r);
  P.chimney(base, 15, 2, 7, 15, r, "brick");
  P.trapRoof(base, {
    x0: 2,
    x1: 81,
    eaveY: 30,
    ridgeY: 9,
    inset: 11,
    ramp: P.SLATE,
    snow: 7,
    r,
    seed: 4,
  });
  // dormer
  P.plaster(base, 38, 18, 11, 11, r);
  P.gableRoof(base, {
    apexX: 43,
    apexY: 12,
    xl: 36,
    xr: 50,
    eaveY: 19,
    th: 2,
    ramp: P.SLATE,
    snow: 2,
    r,
  });
  base.hline(37, 49, 29, C.snow4);
  const dormer: P.Win = {
    x: 40,
    y: 21,
    w: 7,
    h: 8,
    frame: C.ivory1,
    frameShade: C.ivory2,
    mullion: "cross",
    arch: true,
    sill: false,
  };
  // shopfront: painted green panelling
  base.rect(9, 44, 46, 23, C.pine2);
  base.hline(9, 54, 44, C.pine3);
  base.vline(54, 44, 66, C.pine1);
  // fascia board above the awning, with a gilded wheat sprig
  base.rect(11, 32, 42, 6, C.wood1);
  base.rect(12, 33, 40, 4, C.wood2);
  base.hline(12, 51, 33, C.wood3);
  base.map(27, 33, ["a.a.a.a.a.", ".bbbbbbbb.", "a.a.a.a.a."], { a: C.gold2, b: C.gold1 });
  const display: P.Win = {
    x: 12,
    y: 46,
    w: 26,
    h: 16,
    frame: C.wood4,
    frameShade: C.wood1,
    mullion: "v",
    curtains: false,
  };
  const wins: P.Win[] = [
    { x: 59, y: 47, w: 11, h: 11, frame: C.ivory1, frameShade: C.ivory2, mullion: "cross" },
    { x: 60, y: 32, w: 9, h: 9, frame: C.ivory1, frameShade: C.ivory2, mullion: "cross" },
  ];
  windows(base, lit, [display, ...wins, dormer]);
  // closed shop: faint shelf and a second moon streak on the big pane
  base.hline(13, 36, 59, C.glass2);
  base.line(26, 47, 33, 54, C.glass2);
  base.line(27, 47, 34, 54, C.glass2);
  // pastries on the lit display shelf
  lit.hline(13, 36, 59, C.wood2);
  lit.hline(13, 36, 60, C.wood1);
  lit.map(
    15,
    53,
    [
      "..bbb.......ii........bbbb.",
      ".bcccb.....iiii..ff..bcccb",
      "bcccccb...irrrri.ff.bcccccb",
      "bbbbbbb...iiiiii....bbbbbbb",
      "..........aaaaaa...........",
    ],
    { b: C.cookie1, c: C.cookie3, i: C.ivory, r: C.red3, f: C.cookie2, a: C.wood1 },
  );
  const door: P.Door = {
    x: 42,
    y: 45,
    w: 10,
    h: 22,
    body: [C.red1, C.red2, C.red3],
    frame: C.wood1,
    window: true,
  };
  P.door(base, door);
  base.rect(44, 48, 6, 8, C.glass1);
  base.line(44, 50, 46, 48, C.glass2);
  lit.rect(44, 48, 6, 8, C.lit3);
  lit.rect(45, 49, 4, 5, C.lit4);
  lit.vline(47, 48, 55, C.wood1);
  // striped awning with a scalloped hem
  for (let y = 38; y < 43; y++)
    for (let x = 9 - (y - 38); x <= 55 + (y - 38) - 1; x++) {
      const stripe = Math.floor((x + 40) / 3) % 2 === 0;
      base.set(x, y, stripe ? (y === 42 ? C.red2 : C.red3) : y === 42 ? C.ivory1 : C.ivory);
    }
  for (let x = 4; x <= 59; x++) if (Math.floor((x + 40) / 3) % 2 === 0) base.set(x, 43, C.red2);
  base.hline(9, 55, 37, C.snow6);
  base.hline(8, 56, 38, C.snow5);
  // hanging sign with a pretzel
  base.hline(76, 84, 34, C.outline);
  base.set(77, 33, C.outline);
  base.vline(77, 35, 36, C.outline);
  base.vline(83, 35, 36, C.outline);
  base.rect(75, 37, 10, 9, C.wood1);
  base.rect(76, 38, 8, 7, C.wood3);
  base.map(77, 39, [".aa.aa", "a..a.a", "a.aa.a", ".a..a."], { a: C.gold2 });
  base.hline(75, 84, 36, C.snow5);
  base.rect(40, 66, 14, 2, C.stone2);
  base.hline(40, 53, 66, C.snow5);
  P.drift(base, 4, 80, 69, 41);
  P.drift(base, 4, 80, 71, 42, 2);
  P.lightPool(lit, 25, 69, 12, 2);
  P.lightPool(lit, 47, 70, 6, 2);
  P.lightPool(lit, 64, 69, 6, 2);
  // decor: lights framing the display window, awning garland, candy canes, wreath
  D.lightString(
    decor,
    [
      [11, 63],
      [11, 45],
      [38, 45],
      [38, 63],
    ],
    D.BULBS,
    2,
    0,
  );
  D.garland(decor, 6, 31, 44, 2, 6, { bows: true });
  D.garland(decor, 31, 58, 44, 2, 7, { bows: true });
  decor.blit(D.candyCane(), 35, 53);
  decor.blit(D.candyCane(), 53, 53, { flipX: true });
  decor.blit(D.wreath(), 41, 55);
  candlesIn(decor, [wins[0]!]);
  return { base, lit, decor, door: [47, 67], gift: [60, 70], smoke: [18, 1] };
}

// ------------------------------------------------------------------ 5
export function stoneCottage(): HouseArt {
  const r = rng(505);
  const { base, lit, decor } = layers(84, 62);
  P.castShadow(base, 44, 66, 58, 4);
  P.stones(base, 10, 30, 54, 28, r);
  P.chimney(base, 50, 2, 7, 14, r, "stone");
  P.trapRoof(base, {
    x0: 4,
    x1: 69,
    eaveY: 30,
    ridgeY: 10,
    inset: 9,
    ramp: [C.stone0, C.slate0, C.slate1, C.slate2],
    snow: 13,
    r,
    seed: 5,
    mound: 3,
  });
  base.hline(10, 63, 31, C.stone0);
  const wins: P.Win[] = [
    {
      x: 14,
      y: 37,
      w: 9,
      h: 10,
      frame: C.wood3,
      frameShade: C.wood1,
      mullion: "cross",
      shutters: [C.red1, C.red2],
    },
    {
      x: 52,
      y: 37,
      w: 9,
      h: 10,
      frame: C.wood3,
      frameShade: C.wood1,
      mullion: "cross",
      shutters: [C.red1, C.red2],
    },
  ];
  windows(base, lit, wins);
  const door: P.Door = {
    x: 32,
    y: 39,
    w: 10,
    h: 19,
    body: [C.wood1, C.wood2, C.wood3],
    frame: C.stone0,
    arch: true,
    window: true,
  };
  base.rect(30, 36, 14, 3, C.stone3);
  base.hline(30, 43, 38, C.stone1);
  base.hline(30, 43, 35, C.snow5);
  P.door(base, door);
  P.doorLit(lit, door);
  base.hline(33, 40, 43, C.outline);
  base.hline(33, 40, 52, C.outline);
  base.blit(D.lantern(false), 43, 40);
  lit.blit(D.lantern(true), 43, 40);
  base.rect(29, 57, 16, 2, C.stone2);
  base.hline(29, 44, 57, C.snow5);
  P.drift(base, 6, 68, 59, 51, 4);
  P.drift(base, 6, 68, 61, 52, 2);
  P.lightPool(lit, 18, 59, 6, 2);
  P.lightPool(lit, 56, 59, 6, 2);
  P.lightPool(lit, 37, 60, 7, 2);
  // decor: icicle lights along the eave, garland over the door, wreath, snowman
  const pts: Array<[number, number]> = [
    [4, 31],
    [69, 31],
  ];
  D.lightString(decor, pts, [C.bulbWhite, C.bulbBlue], 3, 2);
  D.garland(decor, 30, 43, 36, 1, 8, { bows: true });
  decor.blit(D.wreath(), 30, 42);
  decor.blit(D.snowman(), 65, 37);
  candlesIn(decor, wins);
  return { base, lit, decor, door: [37, 58], gift: [26, 59], smoke: [53, 1] };
}

export const HOUSES = {
  "red-cottage": redCottage,
  "woodland-cabin": woodlandCabin,
  townhouse,
  bakery,
  "stone-cottage": stoneCottage,
} as const;
