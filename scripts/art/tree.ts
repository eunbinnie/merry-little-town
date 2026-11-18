// The village Christmas tree: a dark base layer and an illumination layer
// (bulbs, bright baubles, glowing star) drawn at identical coordinates.
import { Px, rng } from "../lib/px.ts";
import { C } from "../lib/palette.ts";
import { drawPine } from "./pine.ts";
import { bulb, BULBS } from "./decorations.ts";

const STAR = [
  ".....a.....",
  "....aba....",
  "....bcb....",
  "aaabbcbbaaa",
  ".abbcccbba.",
  "..abcccba..",
  "...bcbcb...",
  "..abb.bba..",
  "..ab...ba..",
  ".aa.....aa.",
];

export function christmasTree(): { base: Px; lit: Px } {
  const W = 66;
  const H = 104;
  const base = new Px(W, H);
  const lit = new Px(W, H);
  const r = rng(77);
  const cx = W / 2;
  const baseY = 92;
  const top = 14;
  // trunk + snow mound
  base.rect(cx - 3, baseY - 2, 6, 7, C.wood1);
  base.vline(cx - 3, baseY - 2, baseY + 4, C.wood2);
  base.ellipse(cx, baseY + 7, 20, 4.5, C.snow4);
  base.ellipse(cx - 2, baseY + 6, 16, 3, C.snow5);
  base.ellipse(cx - 5, baseY + 5.5, 8, 1.6, C.snow6);
  const inside = drawPine(base, {
    cx,
    baseY,
    height: baseY - top,
    halfW: 30,
    tiers: 6,
    seed: 5,
    snow: true,
  });

  // swagged bead garlands, one per tier; bulbs ride on them when lit
  const tierH = (baseY - top) / 6;
  let n = 0;
  for (let k = 1; k < 6; k++) {
    const y0 = top + tierH * k + tierH * 0.45;
    const xs: number[] = [];
    for (let x = 0; x < W; x++) if (inside(x, Math.round(y0))) xs.push(x);
    if (xs.length < 4) continue;
    const a = xs[0]! + 1;
    const b = xs[xs.length - 1]! - 1;
    for (let x = a; x <= b; x++) {
      const t = (x - a) / (b - a);
      const y = Math.round(y0 + 3 * Math.sin(Math.PI * t) - 1);
      if (!inside(x, y)) continue;
      base.set(x, y, C.gold0);
      if ((x + k) % 3 === 0) {
        base.set(x, y + 1, "#3a3426");
        bulb(lit, x, y + 1, BULBS[n++ % BULBS.length]!);
      }
    }
  }

  // baubles: dull when dark, glossy when lit
  const colors = [
    [C.red1, C.red3, C.red4],
    [C.gold0, C.gold2, C.gold4],
    [C.blue0, C.blue2, C.blue3],
    [C.ivory2, C.ivory, "#ffffff"],
  ] as const;
  let placed = 0;
  for (let tries = 0; placed < 22 && tries < 500; tries++) {
    const x = Math.floor(cx - 26 + r() * 52);
    const y = Math.floor(top + 10 + r() * (baseY - top - 14));
    if (!inside(x, y) || !inside(x + 1, y + 1) || !inside(x - 1, y) || !inside(x + 2, y)) continue;
    if (lit.alphaAt(x, y) || lit.alphaAt(x + 1, y + 1)) continue;
    const [d, m, h] = colors[placed % colors.length]!;
    base.rect(x, y, 2, 2, d);
    base.set(x, y, m);
    lit.rect(x, y, 2, 2, m);
    lit.set(x, y, h);
    lit.set(x + 1, y + 1, d);
    placed++;
  }

  // star: tarnished gold until the village is complete
  base.map(cx - 5.5, 3, STAR, { a: "#4f4434", b: "#6e604a", c: "#8c7c5e" });
  lit.map(cx - 5.5, 3, STAR, { a: C.gold2, b: C.gold3, c: C.gold4 });
  lit.set(cx, 6, "#ffffff");
  lit.set(cx, 7, "#ffffff");
  for (let i = 1; i <= 3; i++) {
    lit.set(cx, 3 - i, C.gold4, 0.8 - i * 0.2);
    lit.set(cx - 6 - i, 6, C.gold3, 0.7 - i * 0.18);
    lit.set(cx + 5 + i, 6, C.gold3, 0.7 - i * 0.18);
  }
  return { base, lit };
}
