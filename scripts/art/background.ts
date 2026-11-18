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

type Pt = readonly [number, number];

/**
 * Trodden snow paths in core space (256×384): quadratic curves stamped with an
 * elliptical brush, then shaded — banks cast shadow on the upper edge, catch light below.
 */
export function villagePaths(
  curves: ReadonlyArray<readonly [Pt, Pt, Pt]>,
  plaza: { cx: number; cy: number; rx: number; ry: number },
): Px {
  const W = 256;
  const H = 384;
  const mask = new Uint8Array(W * H);
  const stamp = (cx: number, cy: number, rx: number) => {
    const ry = rx * 0.55;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) mask[y * W + x] = 1;
      }
  };
  for (const [a, c, b] of curves) {
    for (let t = 0; t <= 1; t += 0.01) {
      const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0];
      const y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1];
      stamp(x, y, 3.4 + (y - 200) / 60); // narrower with distance
    }
  }
  stamp(plaza.cx, plaza.cy, plaza.rx);
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x] === 1;
  const px = new Px(W, H);
  const r = rng(91);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!at(x, y)) continue;
      let c: string = bayer(x, y) < 0.6 ? C.snow2 : C.snow3;
      if (!at(x, y - 1)) c = C.snow1;
      else if (!at(x, y - 2)) c = C.snow2;
      if (!at(x, y + 1)) c = C.snow4;
      if (!at(x, y + 1) && !at(x, y + 2)) c = C.snow5;
      px.set(x, y, c);
    }
  // footprints
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * H);
    if (at(x, y) && at(x + 1, y) && at(x, y - 2) && at(x, y + 2)) {
      px.set(x, y, C.snow1);
      px.set(x + 1, y, C.snow2);
    }
  }
  return px;
}

/** Repeating band of soft foreground drifts, drawn in front of everything. */
export function foregroundDrifts(): Px {
  const W = 256;
  const px = new Px(W, 40);
  const big = noise1(W, 64, 81);
  const small = noise1(W, 16, 82);
  for (let x = 0; x < W; x++) {
    const top = 6 + (1 - big(x)) * 22 + small(x) * 4;
    const slope = big(x + 1) - big(x - 1); // >0: surface turns towards the moon
    for (let y = Math.floor(top); y < px.h; y++) {
      const d = y - top;
      let c: string = d < 1 ? C.snow6 : d < 3 ? C.snow5 : C.snow4;
      if (slope < -0.01 && d >= 1 && d < 4 && bayer(x, y) < 0.5) c = C.snow4;
      if (d > 5 && bayer(x, y) < Math.min(0.7, (d - 5) / 16)) c = C.snow3;
      px.set(x, y, c);
    }
  }
  return px;
}

/** Rolling horizon hills + the open snow field the village stands on. */
export function ground(): Px {
  const W = 256;
  const H = 236;
  const px = new Px(W, H);
  const back = noise1(W, 64, 31);
  const backFine = noise1(W, 16, 35);
  const front = noise1(W, 128, 32);
  const wave = noise1(W, 32, 33);
  const hillTop = (n: (x: number) => number, x: number, base: number, amp: number) =>
    base + n(x) * amp;
  for (let x = 0; x < W; x++) {
    const bt = (v: number) => hillTop(back, v, 2, 12) + backFine(v) * 2;
    const ft = (v: number) => hillTop(front, v, 14, 10);
    const bTop = Math.round(bt(x));
    const fTop = Math.round(ft(x));
    for (let y = bTop; y < fTop; y++) {
      const d = y - bTop;
      px.set(x, y, d === 0 ? C.snow3 : d < 3 && bayer(x, y) < 0.5 ? C.snow3 : C.snow2);
    }
    for (let y = fTop; y < H; y++) {
      const depth = y - fTop;
      let c: string = C.snow3;
      if (depth === 0) c = C.snow4;
      else if (depth < 3 && bayer(x, y) < 0.5) c = C.snow4;
      else {
        // broken drift crests: each band gets its own phase and only shows in places
        const band = Math.floor((y + wave(x) * 10) / 34);
        const w = (y + wave(x) * 10 + wave(x * 0.7 + band * 37) * 9) % 34;
        const show = wave(x * 1.1 + band * 53 + 11) > 0.62;
        if (show && w < 1.1) c = C.snow4;
        else if (show && w < 2.2 && bayer(x, y) < 0.5) c = C.snow4;
      }
      // the field darkens towards the viewer, framing the village
      const fall = (depth - 150) / 70;
      if (fall > 0 && bayer(x, y) < Math.min(fall, 0.9) * 0.6) c = C.snow2;
      px.set(x, y, c);
    }
  }
  // glints
  const r = rng(34);
  for (let i = 0; i < 70; i++)
    px.set(Math.floor(r() * W), 30 + Math.floor(r() * (H - 30)), C.snow5);
  return px;
}
