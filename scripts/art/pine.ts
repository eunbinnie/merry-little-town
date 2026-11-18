import { Px, bayer, rng, type Color } from "../lib/px.ts";
import { C } from "../lib/palette.ts";

export type PineOpts = {
  cx: number;
  baseY: number; // y of the lowest needles
  height: number;
  halfW: number;
  tiers: number;
  seed: number;
  /** Flat silhouette colour instead of shaded needles (distant forest). */
  flat?: Color;
  snow?: boolean;
  ramp?: readonly Color[]; // dark → light, 5 steps
};

/**
 * Tiered fir tree. Shading follows the moon (upper left); snow settles on every
 * pixel that has open sky directly above it, so tier tops collect snow naturally.
 */
export function drawPine(px: Px, o: PineOpts): (x: number, y: number) => boolean {
  const r = rng(o.seed);
  const ramp = o.ramp ?? [C.pine0, C.pine1, C.pine2, C.pine3, C.pine4];
  const top = o.baseY - o.height;
  const tierH = o.height / o.tiers;
  const jag = new Map<string, boolean>();

  const halfWidth = (y: number): number => {
    if (y < top || y > o.baseY) return -1;
    const t = (y - top) / o.height;
    const p = ((y - top) % tierH) / tierH;
    const env = o.halfW * Math.pow(t, 0.92);
    return Math.max(0, env * (0.5 + 0.5 * p));
  };

  const inside = (x: number, y: number): boolean => {
    const hw = halfWidth(y);
    if (hw < 0) return false;
    const dx = Math.abs(x + 0.5 - o.cx);
    if (dx > hw + 0.5) return false;
    // drooping tips: knock out a few edge pixels on the bottom row of each tier
    const p = ((y - top) % tierH) / tierH;
    if (p > 1 - 1 / tierH && dx > hw - 1.5) {
      const k = `${x},${y}`;
      if (!jag.has(k)) jag.set(k, r() < 0.45);
      if (jag.get(k)) return false;
    }
    return true;
  };

  for (let y = Math.floor(top); y <= o.baseY; y++) {
    const hw = halfWidth(y);
    if (hw < 0) continue;
    for (let x = Math.floor(o.cx - hw - 1); x <= Math.ceil(o.cx + hw + 1); x++) {
      if (!inside(x, y)) continue;
      if (o.flat) {
        px.set(x, y, o.flat);
        continue;
      }
      const u = (x + 0.5 - o.cx) / Math.max(hw, 1);
      const p = ((y - top) % tierH) / tierH;
      // base tone from horizontal position (lit left, shaded right)
      let lvl = u < -0.55 ? 3 : u < 0.05 ? 2 : u < 0.6 ? 1 : 0;
      // dither the band edges
      const edge = u < -0.55 ? u + 0.55 : u < 0.05 ? u - 0.05 : u - 0.6;
      if (Math.abs(edge) < 0.12 && bayer(x, y) < 0.5) lvl = Math.max(0, lvl - 1);
      // underside of the tier above is in shadow
      if (p < 0.3 && Math.abs(u) < 0.7) lvl = Math.max(0, lvl - 1);
      // needle sparkle
      if (lvl >= 2 && r() < 0.06) lvl = Math.min(4, lvl + 1);
      px.set(x, y, ramp[lvl]!);
    }
  }

  if (o.snow) {
    for (let y = Math.floor(top); y <= o.baseY; y++) {
      for (let x = Math.floor(o.cx - o.halfW - 2); x <= Math.ceil(o.cx + o.halfW + 2); x++) {
        if (!inside(x, y) || inside(x, y - 1)) continue;
        const u = (x + 0.5 - o.cx) / o.halfW;
        const flatColor = o.flat ? C.forestSnow : null;
        px.set(x, y, flatColor ?? (u < -0.1 ? C.snow6 : u < 0.35 ? C.snow4 : C.snow3));
        // a second row of snow on the lit side
        if (u < 0.15 && inside(x, y + 1) && !o.flat) px.set(x, y + 1, u < -0.3 ? C.snow4 : C.snow3);
      }
    }
  }
  return inside;
}
