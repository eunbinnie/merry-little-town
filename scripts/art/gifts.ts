// Gift boxes (four wrapping papers) and the eight gift items.
import { Px, type Color } from "../lib/px.ts";
import { C } from "../lib/palette.ts";
import { drawPine } from "./pine.ts";

const INK = "#2a1c24";

type Ramp4 = readonly [Color, Color, Color, Color]; // dark → light

export const WRAPS = {
  crimson: {
    paper: [C.red0, C.red2, C.red3, C.red4],
    ribbon: [C.gold0, C.gold2, C.gold3, C.gold4],
  },
  pine: {
    paper: [C.pine1, C.pine2, C.pine3, C.pine4],
    ribbon: [C.red1, C.red2, C.red3, C.red4],
  },
  ivory: {
    paper: [C.ivory2, C.ivory1, C.ivory, "#fffdf7"],
    ribbon: [C.pine1, C.pine2, C.pine3, C.pine4],
  },
  midnight: {
    paper: [C.blue0, C.blue1, C.blue2, C.blue3],
    ribbon: [C.snow2, C.snow4, C.snow5, C.snow6],
  },
} as const satisfies Record<string, { paper: Ramp4; ribbon: Ramp4 }>;
export type WrapId = keyof typeof WRAPS;

/** Wrapped present, 11×10: doorstep gift, sleigh cargo and HUD icon. */
export function giftBox(id: WrapId): Px {
  const [pd, pm, pl, ph] = WRAPS[id].paper;
  const [, rm, rl] = WRAPS[id].ribbon;
  const px = new Px(11, 10);
  px.rect(1, 3, 9, 7, pl);
  px.vline(9, 3, 9, pd);
  px.hline(1, 9, 9, pd);
  px.rect(0, 2, 11, 2, ph);
  px.hline(0, 10, 3, pm);
  px.vline(5, 2, 9, rl);
  px.hline(1, 9, 6, rl);
  px.map(2, 0, ["aa...aa", ".abbba."], { a: rm, b: rl });
  px.hline(1, 9, 9, C.snow5);
  return px;
}

// ---------------------------------------------------------------- items

/** Ellipse lit from the upper left; ramp is dark → light. */
function ball(px: Px, cx: number, cy: number, rx: number, ry: number, ramp: Ramp4): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      const l = -nx * 0.6 - ny * 0.8;
      px.set(x, y, l > 0.45 ? ramp[3] : l > -0.15 ? ramp[2] : l > -0.55 ? ramp[1] : ramp[0]);
    }
}

function teddy(): Px {
  const px = new Px(24, 24);
  const fur: Ramp4 = [C.wood1, C.wood2, C.wood3, C.wood4];
  const light: Ramp4 = [C.wood3, C.wood4, C.wood5, "#d0ab88"];
  ball(px, 6, 15.5, 2.4, 3.6, fur);
  ball(px, 18, 15.5, 2.4, 3.6, fur);
  ball(px, 12, 17, 6.2, 5.8, fur);
  ball(px, 8, 21, 2.8, 2.2, fur);
  ball(px, 16, 21, 2.8, 2.2, fur);
  ball(px, 8, 21.5, 1.4, 1.1, light);
  ball(px, 16, 21.5, 1.4, 1.1, light);
  ball(px, 12, 17.5, 3.5, 3.2, light);
  ball(px, 6.5, 4.5, 2.6, 2.6, fur);
  ball(px, 17.5, 4.5, 2.6, 2.6, fur);
  ball(px, 6.5, 4.8, 1.2, 1.2, light);
  ball(px, 17.5, 4.8, 1.2, 1.2, light);
  ball(px, 12, 8.5, 6.5, 5.6, fur);
  ball(px, 12, 10.8, 3, 2.2, light);
  px.set(9, 7, INK);
  px.set(15, 7, INK);
  px.set(9, 6, "#5a4038");
  px.rect(11, 9, 2, 1, INK);
  px.set(12, 10, INK);
  px.set(11, 11, INK);
  px.set(13, 11, INK);
  // red bow tie
  px.map(8, 13, ["pp...pp", "rrp.prr", "rRRkRRr", "rr...rr"], {
    p: C.red4,
    r: C.red3,
    R: C.red2,
    k: C.red1,
  });
  px.outline(INK);
  return px;
}

function gingerbread(): Px {
  const px = new Px(24, 24);
  const dough: Ramp4 = [C.cookie0, C.cookie1, C.cookie2, C.cookie3];
  ball(px, 5, 11.5, 3.5, 2.4, dough);
  ball(px, 19, 11.5, 3.5, 2.4, dough);
  ball(px, 8.5, 19.5, 2.8, 3.8, dough);
  ball(px, 15.5, 19.5, 2.8, 3.8, dough);
  ball(px, 12, 14.5, 5.2, 6, dough);
  ball(px, 12, 6, 4.8, 4.6, dough);
  // icing
  const icing = "#fff8ee";
  for (const [x, y] of [
    [3, 10],
    [4, 11],
    [3, 12],
    [20, 10],
    [19, 11],
    [20, 12],
    [7, 21],
    [8, 22],
    [9, 21],
    [15, 21],
    [16, 22],
    [17, 21],
  ] as const)
    px.set(x, y, icing);
  px.set(10, 5, INK);
  px.set(14, 5, INK);
  px.hline(10, 14, 8, icing);
  px.set(9, 7, icing);
  px.set(15, 7, icing);
  px.set(12, 12, C.red3);
  px.set(12, 15, C.pine3);
  px.set(12, 18, C.red3);
  px.set(11, 12, C.red2);
  px.set(11, 15, C.pine2);
  px.set(11, 18, C.red2);
  px.outline(INK);
  return px;
}

function stocking(): Px {
  const px = new Px(24, 24);
  const shape: Array<[number, number]> = [
    [7, 6],
    [16, 6],
    [16, 15],
    [19, 17],
    [20, 20],
    [17, 23],
    [9, 23],
    [6, 21],
    [7, 18],
  ];
  px.poly(shape, (x, y) => {
    if (y >= 20 && x >= 15) return x + y > 37 ? C.pine2 : C.pine3; // toe
    if (y >= 18 && x <= 9) return C.pine2; // heel
    const band = Math.floor((y - 6) / 3) % 2 === 0;
    const base = band ? C.red3 : C.ivory;
    if (x >= 14) return band ? C.red2 : C.ivory1;
    if (x <= 7) return band ? C.red4 : "#fffdf6";
    return base;
  });
  // fluffy cuff + loop
  for (let x = 6; x <= 17; x++)
    for (let y = 2; y <= 5; y++)
      px.set(x, y, (x + y) % 3 === 0 ? C.snow4 : y === 2 ? "#ffffff" : C.snow6);
  px.set(5, 3, C.snow6);
  px.set(18, 4, C.snow4);
  px.map(15, 0, [".aa", "a.a", "a.a"], { a: C.red2 });
  px.outline(INK);
  return px;
}

function snowGlobe(): Px {
  const px = new Px(24, 24);
  const cx = 12;
  const cy = 10;
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > 9) continue;
      px.set(x, y, d > 8 ? "#9fc1e0" : y > 13 ? "#e8f2fa" : "#2c4a78");
    }
  // scene inside: snowy hill, little pine, tiny house
  px.ellipse(12, 15.5, 7.5, 2.5, C.snow5);
  drawPine(px, { cx: 8.5, baseY: 14, height: 8, halfW: 3, tiers: 3, seed: 9, snow: true });
  px.rect(12, 10, 6, 5, C.red3);
  px.vline(17, 10, 14, C.red2);
  px.poly(
    [
      [11, 10],
      [15, 6.5],
      [19, 10],
    ],
    C.snow6,
  );
  px.set(14, 12, C.gold3);
  px.set(15, 12, C.gold3);
  px.set(14, 13, C.gold2);
  for (const [x, y] of [
    [7, 4],
    [11, 3],
    [16, 5],
    [6, 8],
    [18, 8],
    [10, 7],
    [14, 2],
  ] as const)
    px.set(x, y, "#ffffff");
  // glass highlight
  px.set(7, 4, "#ffffff");
  px.vline(5, 6, 9, "#cfe2f3");
  px.set(6, 4, "#cfe2f3");
  // base
  px.poly(
    [
      [4, 18],
      [20, 18],
      [21, 23],
      [3, 23],
    ],
    (x, y) => (y === 18 ? C.gold3 : y === 19 ? C.gold1 : x > 17 ? C.red1 : C.red2),
  );
  px.hline(5, 18, 21, C.gold2);
  px.outline(INK);
  return px;
}

/** Knitted scarf: a soft neck loop with two tails, striped only near the ends. */
function scarf(): Px {
  const px = new Px(24, 24);
  // band along a polyline; colour depends on distance from the tail end
  const band = (pts: Array<[number, number]>, width: number, endStripes: boolean) => {
    const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]));
    const total = segs.reduce((a, b) => a + b, 0);
    let t = 0;
    segs.forEach((len, i) => {
      const [ax, ay] = pts[i]!;
      const [bx, by] = pts[i + 1]!;
      for (let s = 0; s <= len; s += 0.25) {
        const x = ax + ((bx - ax) * s) / len;
        const y = ay + ((by - ay) * s) / len;
        const nx = -(by - ay) / len;
        const ny = (bx - ax) / len;
        const fromEnd = total - (t + s);
        const stripe = endStripes && fromEnd < 7 ? Math.floor(fromEnd / 1.5) % 3 : -1;
        for (let o = -width / 2; o <= width / 2; o += 0.5) {
          const xx = Math.round(x + nx * o);
          const yy = Math.round(y + ny * o);
          const lit = o < -width / 6;
          let c: string = lit ? C.red4 : C.red3;
          if (o > width / 3) c = C.red2;
          if (stripe === 0) c = lit ? "#fffdf6" : C.ivory1;
          if (stripe === 2) c = lit ? C.pine4 : C.pine3;
          // knit rows: little "v" stitches
          if ((xx + yy) % 2 === 0 && yy % 2 === 0 && c === C.red3) c = C.red2;
          px.set(xx, yy, c);
        }
      }
      t += len;
    });
  };
  band(
    [
      [16, 8],
      [17.5, 14],
      [17, 19.5],
    ],
    5,
    true,
  ); // back tail
  band(
    [
      [6, 9],
      [7, 4.5],
      [12, 3],
      [17, 4.5],
      [17.5, 8.5],
    ],
    5,
    false,
  ); // neck loop
  band(
    [
      [7, 8],
      [9, 13],
      [8, 19.5],
    ],
    5,
    true,
  ); // front tail
  for (const x of [6, 8, 10]) px.vline(x, 22, 23, C.ivory1);
  for (const x of [15, 17, 19]) px.vline(x, 22, 23, C.ivory1);
  px.outline(INK);
  return px;
}

function candyCaneItem(): Px {
  const px = new Px(24, 24);
  const pts: Array<[number, number]> = [];
  for (let y = 22; y >= 9; y -= 0.25) pts.push([15, y]);
  for (let a = 0; a <= Math.PI * 1.05; a += 0.04)
    pts.push([10.5 + 4.5 * Math.cos(a), 9 - 4.5 * Math.sin(a)]);
  pts.forEach(([x, y], i) => {
    for (let o = -1.6; o <= 1.6; o += 0.4) {
      const nx = i < 52 ? 1 : Math.cos((i - 52) * 0.04);
      const ny = i < 52 ? 0 : -Math.sin((i - 52) * 0.04);
      const xx = Math.round(x + nx * o);
      const yy = Math.round(y + ny * o);
      const stripe = Math.floor((i * 0.25 + o * 1.2) / 1.6) % 2 === 0;
      const lit = o < 0;
      px.set(xx, yy, stripe ? (lit ? C.red4 : C.red2) : lit ? "#ffffff" : C.ivory1);
    }
  });
  // ribbon bow at the bend
  px.map(13, 9, ["g...g", "hgGgh", ".gGg.", ".g.g."], { g: C.pine3, G: C.pine1, h: C.pine4 });
  px.outline(INK);
  return px;
}

function miniTree(): Px {
  const px = new Px(24, 24);
  drawPine(px, { cx: 12, baseY: 17, height: 14, halfW: 7.5, tiers: 3, seed: 21, snow: true });
  for (const [x, y, c] of [
    [10, 9, C.red3],
    [14, 11, C.gold3],
    [8, 14, C.blue3],
    [12, 14, C.red3],
    [16, 15, C.gold3],
    [11, 12, C.ivory],
  ] as const)
    px.set(x, y, c);
  px.map(10, 0, ["..a..", ".aba.", "..a.."], { a: C.gold2, b: C.gold4 });
  px.rect(11, 17, 2, 2, C.wood1);
  // pot
  px.poly(
    [
      [7, 18],
      [17, 18],
      [16, 23],
      [8, 23],
    ],
    (x, y) => (y === 18 ? C.red4 : x > 14 ? C.red1 : C.red2),
  );
  px.hline(7, 16, 19, C.gold2);
  px.outline(INK);
  return px;
}

function goldenStar(): Px {
  const px = new Px(24, 24);
  const cx = 12;
  const cy = 12.8;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? 10.5 : 4.4;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  px.poly(pts, (x, y) => {
    const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
    // each arm has a lit half and a shaded half
    const seg = ((((a + Math.PI / 2) / (Math.PI / 5)) % 2) + 2) % 2;
    const litHalf = seg < 1;
    const upperLeft = x + y < cx + cy;
    if (litHalf) return upperLeft ? C.gold4 : C.gold3;
    return upperLeft ? C.gold2 : C.gold1;
  });
  px.set(11, 11, "#ffffff");
  px.set(12, 12, C.gold4);
  px.outline(C.gold0);
  for (const [x, y] of [
    [3, 3],
    [20, 2],
    [21, 19],
  ] as const) {
    px.set(x, y, C.gold3);
    px.set(x - 1, y, C.gold2);
    px.set(x + 1, y, C.gold2);
    px.set(x, y - 1, C.gold2);
    px.set(x, y + 1, C.gold2);
  }
  return px;
}

export const ITEMS = {
  "teddy-bear": teddy,
  gingerbread,
  stocking,
  "snow-globe": snowGlobe,
  scarf,
  "candy-cane": candyCaneItem,
  "mini-tree": miniTree,
  "golden-star": goldenStar,
} as const;
