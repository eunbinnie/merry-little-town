import { Px, bayer, noise1, rng } from "../lib/px.ts";
import { C } from "../lib/palette.ts";
import { drawPine } from "./pine.ts";

// Tiles repeat horizontally so wide screens extend the landscape instead of stretching it.

/** Banded, Bayer-dithered night sky. Anchor its bottom at the horizon. */
export function sky(): Px {
  const h = 176;
  const px = new Px(4, h);
  const bands = [C.sky0, C.sky1, C.sky2, C.sky3, C.sky4, C.sky5];
  for (let y = 0; y < h; y++) {
    // ease so most of the sky stays deep and the glow hugs the horizon
    const t = Math.pow(y / (h - 1), 1.6) * (bands.length - 1);
    const i = Math.floor(t);
    const f = t - i;
    for (let x = 0; x < px.w; x++) {
      const c = f > bayer(x, y) ? bands[Math.min(i + 1, bands.length - 1)]! : bands[i]!;
      px.set(x, y, c);
    }
  }
  return px;
}

export function stars(): Px {
  const px = new Px(256, 150);
  const r = rng(7);
  for (let n = 0; n < 150; n++) {
    const x = Math.floor(r() * px.w);
    const y = Math.floor(Math.pow(r(), 1.5) * px.h); // denser near the top
    const k = r();
    if (k < 0.62) px.set(x, y, C.starDim);
    else if (k < 0.9) px.set(x, y, k < 0.8 ? C.star : C.starWarm);
    else {
      px.set(x, y, C.star);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const)
        px.set(x + dx, y + dy, C.starDim);
    }
  }
  return px;
}

export function moon(): Px {
  const px = new Px(40, 40);
  const cx = 20;
  const cy = 20;
  // halo: dithered rings that fade out
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 40; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < 11 || d > 19.5) continue;
      const t = (d - 11) / 8.5;
      if (bayer(x, y) > 1 - t) continue;
      px.set(x, y, t < 0.45 ? C.sky5 : C.sky4, 0.9 - t * 0.6);
    }
  px.ellipse(cx, cy, 10, 10, C.moon);
  // mare patches + terminator shading on the lower right
  const pal = { a: C.moonShade, b: C.moonDark };
  px.map(
    13,
    12,
    [
      "..aa......",
      ".aaab.....",
      ".aab......",
      "..a.....a.",
      "......aaa.",
      ".....aab..",
      "......a...",
    ],
    pal,
  );
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 40; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > 10) continue;
      const lx = x + 0.5 - cx;
      const ly = y + 0.5 - cy;
      if (d > 8.2 && lx + ly > 4) px.set(x, y, bayer(x, y) < 0.6 ? C.moonShade : C.moon);
      if (d > 9.2 && lx + ly > 7) px.set(x, y, C.moonDark);
    }
  px.set(15, 14, "#fffaf0");
  px.set(16, 13, "#fffaf0");
  return px;
}

type Peak = { x: number; h: number; sl: number; sr: number };

function range(
  px: Px,
  period: number,
  peaks: Peak[],
  baseY: number,
  pal: { lit: string; dark: string; snow: string; snowDark: string },
  seed: number,
) {
  const j1 = noise1(period, 16, seed);
  const j2 = noise1(period, 4, seed + 7);
  const jitter = (x: number) => j1(x) * 2.5 + j2(x) * 1.2;
  const capN = noise1(period, 4, seed + 1);
  const ridge = (x: number) => {
    let best = -Infinity;
    let side = 0;
    let peakH = 0;
    for (const p of peaks) {
      for (const off of [-period, 0, period]) {
        const dx = x - (p.x + off);
        const v = p.h - (dx < 0 ? -dx * p.sl : dx * p.sr);
        if (v > best) {
          best = v;
          side = dx;
          peakH = p.h;
        }
      }
    }
    return { y: baseY - best - jitter(x) * 2, side, peakH };
  };
  for (let x = 0; x < period; x++) {
    const { y: ry, side, peakH } = ridge(x);
    const top = Math.round(ry);
    const lit = side < 0;
    const cap = peakH * 0.22 + capN(x) * 5 - 1;
    for (let y = Math.max(0, top); y < px.h; y++) {
      const depth = y - top;
      let c = lit ? pal.lit : pal.dark;
      if (depth < cap) c = lit ? pal.snow : pal.snowDark;
      else if (depth < cap + 3 && bayer(x, y) < 0.5) c = lit ? pal.snow : pal.snowDark;
      // ridge streaks running down the lit faces
      if (lit && depth >= cap && depth < cap + 10 && (x + Math.floor(depth / 3)) % 7 === 0)
        c = pal.snowDark;
      px.set(x, y, c);
    }
  }
}

export function mountains(): Px {
  const W = 512;
  const px = new Px(W, 76);
  const r = rng(11);
  const far: Peak[] = [];
  for (let x = 0; x < W; x += 52 + Math.floor(r() * 30))
    far.push({ x, h: 38 + r() * 26, sl: 0.7 + r() * 0.4, sr: 0.8 + r() * 0.5 });
  // far range sits in the horizon haze: close to the sky colour, faint snow
  range(
    px,
    W,
    far,
    76,
    { lit: "#2c3f60", dark: "#243554", snow: "#62779d", snowDark: "#43577c" },
    3,
  );
  const near: Peak[] = [];
  for (let x = 20; x < W; x += 40 + Math.floor(r() * 36))
    near.push({ x, h: 18 + r() * 18, sl: 0.6 + r() * 0.5, sr: 0.7 + r() * 0.5 });
  const nearPx = new Px(W, 76);
  range(
    nearPx,
    W,
    near,
    76,
    { lit: C.mtn1, dark: C.mtn0, snow: C.mtnSnow, snowDark: C.mtnSnowShade },
    5,
  );
  px.blit(nearPx, 0, 0);
  return px;
}

export function forest(): Px {
  const W = 256;
  const px = new Px(W, 46);
  const r = rng(21);
  // far row: small, flat, dense
  for (let x = -6; x < W + 6; x += 3 + Math.floor(r() * 3)) {
    const h = 7 + Math.floor(r() * 7);
    for (const off of [0, W])
      drawPine(px, {
        cx: x + off,
        baseY: 32,
        height: h,
        halfW: 2.5 + h * 0.18,
        tiers: 3,
        seed: x + 999,
        flat: C.forest1,
        snow: true,
      });
  }
  px.rect(0, 30, W, 16, C.forest1);
  // near row: taller, darker, with snowy tiers
  for (let x = -8; x < W + 8; x += 5 + Math.floor(r() * 6)) {
    const h = 11 + Math.floor(r() * 14);
    const cx = x + 0.5;
    for (const off of [0, -W])
      drawPine(px, {
        cx: cx + off,
        baseY: 40,
        height: h,
        halfW: 3 + h * 0.2,
        tiers: 3 + Math.floor(h / 9),
        seed: x,
        flat: C.forest0,
        snow: true,
      });
  }
  px.rect(0, 39, W, 7, C.forest0);
  return px;
}
