import { Px, bayer, rng, type Color } from "../lib/px.ts";
import { C } from "../lib/palette.ts";
import { drawPine } from "./pine.ts";

export const WIRE = "#1b1d29";
export const BULBS: readonly Color[] = [C.bulbRed, C.bulbGold, C.bulbGreen, C.bulbBlue];
export const WARM_BULBS: readonly Color[] = [C.bulbGold, C.bulbWhite];

export function wreath(): Px {
  const px = new Px(13, 14);
  const r = rng(51);
  const cx = 6.5;
  const cy = 6;
  for (let y = 0; y < 13; y++)
    for (let x = 0; x < 13; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > 6 || d < 2.6) continue;
      const lit = x + y < 11;
      let c: Color = d > 5.2 ? (lit ? C.pine3 : C.pine1) : lit ? C.pine3 : C.pine2;
      if (r() < 0.25) c = lit ? C.pine4 : C.pine2;
      if (d < 3.4) c = C.pine1;
      px.set(x, y, c);
    }
  // berries
  for (const [x, y] of [
    [2, 4],
    [9, 2],
    [10, 7],
    [3, 9],
    [6, 1],
  ] as const) {
    px.set(x, y, C.red3);
    px.set(x + 1, y, C.red2);
  }
  // bow
  px.map(3, 9, ["rr...rr", "rprRrpr", ".rRRRr.", "..r.r..", "..R.R.."], {
    r: C.red3,
    p: C.red4,
    R: C.red1,
  });
  return px;
}

/** Sagging pine garland between two points, optionally with bows and bulbs. */
export function garland(
  px: Px,
  x0: number,
  x1: number,
  y: number,
  sag: number,
  seed: number,
  opts: { bows?: boolean; bulbs?: readonly Color[] } = {},
): void {
  const r = rng(seed);
  const yAt = (x: number) => y + Math.round(sag * (1 - ((2 * (x - x0)) / (x1 - x0) - 1) ** 2));
  for (let x = x0; x <= x1; x++) {
    const yy = yAt(x);
    px.set(x, yy - 1, r() < 0.5 ? C.pine3 : C.pine4);
    px.set(x, yy, r() < 0.3 ? C.pine3 : C.pine2);
    px.set(x, yy + 1, C.pine1);
    if (r() < 0.3) px.set(x, yy - 2, C.pine3);
    if (r() < 0.3) px.set(x, yy + 2, C.pine1);
  }
  if (opts.bulbs) {
    let k = 0;
    for (let x = x0 + 2; x < x1 - 1; x += 3)
      bulb(px, x, yAt(x) + 2, opts.bulbs[k++ % opts.bulbs.length]!);
  }
  if (opts.bows) for (const bx of [x0, x1]) bow(px, bx, yAt(bx) - 1);
}

export function bow(px: Px, cx: number, y: number): void {
  px.map(cx - 2, y - 1, ["r...r", "prRrp", ".rRr.", ".R.R."], { r: C.red3, p: C.red4, R: C.red1 });
}

/** One bulb with a faint halo. */
export function bulb(px: Px, x: number, y: number, c: Color): void {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const)
    px.set(x + dx, y + dy, c, 0.3);
  px.set(x, y, c);
}

/** String of lights along a polyline: thin wire, bulbs every `step` pixels. */
export function lightString(
  px: Px,
  pts: ReadonlyArray<readonly [number, number]>,
  colors: readonly Color[],
  step = 3,
  hang = 1,
): void {
  let n = 0;
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s]!;
    const [bx, by] = pts[s + 1]!;
    const len = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let i = 0; i <= len; i++) {
      const x = Math.round(ax + ((bx - ax) * i) / len);
      const y = Math.round(ay + ((by - ay) * i) / len);
      px.set(x, y, WIRE);
      if (n % step === 0) bulb(px, x, y + hang, colors[Math.floor(n / step) % colors.length]!);
      n++;
    }
  }
}

export function candle(px: Px, x: number, y: number): void {
  // x,y = top-left of a 3×7 candle with flame
  px.set(x + 1, y, C.gold4);
  px.set(x + 1, y + 1, C.gold3);
  px.set(x, y + 1, C.gold3, 0.4);
  px.set(x + 2, y + 1, C.gold3, 0.4);
  px.rect(x, y + 2, 3, 4, C.ivory);
  px.vline(x + 2, y + 2, y + 5, C.ivory1);
  px.hline(x - 1, x + 3, y + 6, C.gold1);
}

export function lantern(lit: boolean): Px {
  const px = new Px(7, 11);
  const glass = lit ? [C.lit4, C.lit3, C.lit2] : [C.glass2, C.glass1, C.glass0];
  px.map(
    0,
    0,
    [
      "...a...",
      "..bbb..",
      ".bcccb.",
      "bbbbbbb",
      ".b123b.",
      ".b213b.",
      ".b123b.",
      ".b232b.",
      ".bbbbb.",
      "..bdb..",
      "...b...",
    ],
    {
      a: C.outline,
      b: "#1f2433",
      c: C.snow5,
      d: C.slate2,
      "1": glass[0]!,
      "2": glass[1]!,
      "3": glass[2]!,
    },
  );
  if (lit) {
    for (const [x, y] of [
      [0, 5],
      [6, 5],
      [3, 9],
    ] as const)
      px.set(x, y, C.gold3, 0.35);
  }
  return px;
}

export function lamppost(lit: boolean): Px {
  const px = new Px(9, 30);
  px.blit(lantern(lit), 1, 0);
  const iron = "#1f2433";
  px.vline(4, 11, 27, iron);
  px.vline(3, 12, 26, C.slate1);
  px.hline(2, 6, 18, iron);
  px.hline(2, 6, 27, iron);
  px.rect(2, 28, 5, 2, iron);
  px.hline(1, 7, 29, C.snow5);
  px.set(2, 17, C.snow5);
  px.set(6, 17, C.snow4);
  // a sprig of pine and a red ribbon tied under the lantern
  for (const [x, y, c] of [
    [2, 12, C.pine3],
    [3, 11, C.pine4],
    [5, 11, C.pine3],
    [6, 12, C.pine2],
    [4, 11, C.pine3],
  ] as const)
    px.set(x, y, c);
  bow(px, 4, 13);
  // a pine twist down the pole
  for (const y of [20, 23, 26]) {
    px.set(3, y, C.pine3);
    px.set(5, y + 1, C.pine2);
  }
  return px;
}

/** A short wooden post with a lantern, tied with a ribbon: always burning. */
export function lanternPost(): Px {
  const px = new Px(7, 32);
  px.blit(lantern(true), 0, 0);
  px.vline(3, 11, 30, C.wood2);
  px.vline(2, 11, 30, C.wood4);
  px.vline(4, 12, 30, C.wood1);
  for (const [x, y, c] of [
    [1, 12, C.pine3],
    [5, 12, C.pine2],
    [2, 11, C.pine4],
    [4, 11, C.pine3],
  ] as const)
    px.set(x, y, c);
  bow(px, 3, 14);
  px.ellipse(3.5, 30.5, 3.2, 1.2, C.snow5);
  return px;
}

/** A small pine dressed for Christmas: soft bulbs, a gold star. */
export function xmasTree(): Px {
  const px = new Px(20, 33);
  const tree = pine("small", 9);
  px.blit(tree, 0, 1);
  const r = rng(77);
  const placed: Array<readonly [number, number]> = [];
  for (let i = 0; i < 400 && placed.length < 11; i++) {
    const x = 2 + Math.floor(r() * 16);
    const y = 7 + Math.floor(r() * 20);
    if (tree.alphaAt(x, y - 1) < 200 || tree.alphaAt(x, y) < 200) continue;
    if (placed.some(([px2, py]) => Math.abs(px2 - x) + Math.abs(py - y) < 4)) continue;
    placed.push([x, y]);
  }
  const warm = [C.bulbRed, C.bulbGold, C.bulbGreen, C.bulbWhite];
  placed.forEach(([x, y], i) => px.set(x, y, warm[i % warm.length]!));
  px.map(8, 0, [".a.", "aba", ".a."], { a: C.gold3, b: C.gold4 });
  return px;
}

/** Three wrapped presents stacked by the workshop. */
export function giftStack(boxes: readonly Px[]): Px {
  const px = new Px(18, 16);
  px.blit(boxes[2]!, 4, 0); // peeking over the back
  px.blit(boxes[0]!, 0, 6);
  px.blit(boxes[1]!, 7, 6);
  return px;
}

export function snowman(): Px {
  const px = new Px(18, 24);
  const ball = (cx: number, cy: number, rad: number) => {
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++)
      for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const d = Math.hypot(dx, dy) / rad;
        if (d > 1) continue;
        const shade = dx * 0.7 + dy * 0.7;
        let c: Color = C.snow6;
        if (shade > rad * 0.15) c = C.snow5;
        if (shade > rad * 0.5 || d > 0.92) c = C.snow4;
        if (shade > rad * 0.75 && bayer(x, y) < 0.5) c = C.snow3;
        px.set(x, y, c);
      }
  };
  ball(9, 18.5, 5.5);
  ball(9, 11, 4.2);
  ball(9, 5.5, 3.2);
  // hat
  px.rect(6, 0, 6, 3, C.outline);
  px.hline(5, 12, 3, C.outline);
  px.hline(6, 11, 2, C.red2);
  // face
  px.set(8, 5, C.outline);
  px.set(10, 5, C.outline);
  px.set(9, 6, C.carrot);
  px.set(10, 6, C.carrot);
  px.set(11, 7, C.carrot);
  // scarf
  px.hline(6, 12, 8, C.red3);
  px.hline(6, 12, 9, C.red2);
  px.vline(11, 9, 12, C.red3);
  px.vline(12, 10, 12, C.red1);
  // buttons
  px.set(9, 11, C.outline);
  px.set(9, 13, C.outline);
  px.set(9, 17, C.outline);
  // arms
  px.line(4, 11, 0, 8, C.wood2);
  px.set(0, 7, C.wood2);
  px.line(14, 11, 17, 9, C.wood1);
  px.set(17, 8, C.wood1);
  return px;
}

export function candyCane(): Px {
  const px = new Px(6, 14);
  const shape = [
    "..aaa.",
    ".a...a",
    "a....a",
    "a.....",
    "a.....",
    "a.....",
    "a.....",
    "a.....",
    "a.....",
    "a.....",
    "a.....",
    "a.....",
    "a.....",
    "a.....",
  ];
  const pts: Array<[number, number]> = [];
  shape.forEach((row, y) => [...row].forEach((ch, x) => ch === "a" && pts.push([x, y])));
  for (const [x, y] of pts) {
    px.set(x, y, (x + y) % 3 === 0 ? C.ivory : C.red3);
    px.set(x + 1, y + (y < 2 ? 1 : 0), (x + y + 1) % 3 === 0 ? C.ivory1 : C.red2);
  }
  return px;
}

export function giftPile(): Px {
  const px = new Px(34, 13);
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    body: readonly [Color, Color],
    ribbon: Color,
  ) => {
    px.rect(x, y, w, h, body[0]);
    px.rect(x, y, w - 1, h - 1, body[1]);
    px.vline(x + Math.floor(w / 2), y, y + h - 1, ribbon);
    px.hline(x, x + w - 1, y + Math.floor(h / 2), ribbon);
    px.set(x + Math.floor(w / 2) - 1, y - 1, ribbon);
    px.set(x + Math.floor(w / 2) + 1, y - 1, ribbon);
    px.hline(x, x + w - 2, y, C.snow5);
  };
  box(1, 5, 9, 8, [C.red1, C.red3], C.gold3);
  box(9, 2, 8, 11, [C.pine1, C.pine3], C.red3);
  box(17, 6, 10, 7, [C.blue0, C.blue2], C.ivory);
  box(25, 8, 8, 5, [C.ivory2, C.ivory], C.red3);
  return px;
}

export function sparkle(big: boolean): Px {
  if (!big) {
    const px = new Px(5, 5);
    px.map(0, 0, ["..a..", "..b..", "abcba", "..b..", "..a.."], {
      a: C.gold2,
      b: C.gold3,
      c: C.gold4,
    });
    return px;
  }
  const px = new Px(9, 9);
  px.map(
    0,
    0,
    [
      "....a....",
      "....b....",
      "...aba...",
      "..abcba..",
      "abbcdcbba",
      "..abcba..",
      "...aba...",
      "....b....",
      "....a....",
    ],
    { a: C.gold2, b: C.gold3, c: C.gold4, d: "#ffffff" },
  );
  return px;
}

export function twinkle(): Px {
  const px = new Px(5, 5);
  px.map(0, 0, ["..a..", "..b..", "abcba", "..b..", "..a.."], {
    a: C.starDim,
    b: C.star,
    c: "#ffffff",
  });
  return px;
}

export function smoke(): Px {
  const px = new Px(8, 6);
  const r = rng(61);
  px.ellipse(4, 3, 3.8, 2.6, C.snow2, 0.75);
  px.ellipse(3.4, 2.4, 2.4, 1.6, C.snow3, 0.8);
  for (let i = 0; i < 6; i++) px.set(Math.floor(r() * 8), Math.floor(r() * 6), C.snow3, 0.4);
  return px;
}

export function pine(size: "large" | "small" | "tiny", seed: number): Px {
  const dims = { large: [30, 50, 6], small: [20, 32, 4], tiny: [12, 20, 3] } as const;
  const [w, h, tiers] = dims[size];
  const px = new Px(w, h);
  // trunk
  px.rect(Math.floor(w / 2) - 1, h - 5, 3, 4, C.wood1);
  px.set(Math.floor(w / 2) - 1, h - 5, C.wood2);
  drawPine(px, {
    cx: w / 2,
    baseY: h - 4,
    height: h - 5,
    halfW: w / 2 - 1,
    tiers,
    seed,
    snow: true,
  });
  // snow at the foot
  px.ellipse(w / 2, h - 1.5, w * 0.32, 1.6, C.snow5);
  return px;
}

export function fence(): Px {
  const px = new Px(34, 11);
  for (const x of [1, 12, 23]) {
    px.rect(x, 1, 3, 10, C.wood3);
    px.vline(x + 2, 2, 10, C.wood1);
    px.vline(x, 2, 10, C.wood4);
    px.hline(x, x + 2, 0, C.snow6);
  }
  for (const y of [3, 7]) {
    px.hline(0, 33, y, C.wood3);
    px.hline(0, 33, y + 1, C.wood1);
    px.hline(0, 33, y - 1, C.snow5);
  }
  for (const x of [1, 12, 23]) px.hline(x, x + 2, 0, C.snow6);
  // pine garland swagged along the top rail, a bow on each post
  garland(px, 2, 13, 2, 2, 31);
  garland(px, 13, 24, 2, 2, 32);
  garland(px, 24, 33, 2, 2, 33);
  for (const x of [2, 13, 24]) bow(px, x, 2);
  return px;
}

/** Bobbing arrow above houses that can still receive a gift. */
export function marker(): Px {
  const px = new Px(9, 7);
  px.map(
    0,
    0,
    ["aaaaaaaaa", "abbbbbbba", "abccccbba", ".abccbba.", "..abbba..", "...aba...", "....a...."],
    { a: C.outline, b: C.gold3, c: C.gold4 },
  );
  return px;
}
