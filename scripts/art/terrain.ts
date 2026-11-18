// The village ground as one painted image: moonlit snow field, trodden roads,
// a cobbled plaza dusted with snow, and the frozen river + pond with banks.
import { Px, bayer, noise1, rng, type Color } from "../lib/px.ts";
import { C } from "../lib/palette.ts";
import {
  GROUND_Y,
  PLAZA,
  POND,
  RIVER,
  WORLD,
  distToPolyline,
  ellipseValue,
  roadDistance,
  type Pt,
} from "../../src/game/world.ts";

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 2D value noise in [0, 1). */
function vnoise(x: number, y: number, scale: number, seed: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

export function paintGround(): Px {
  const W = WORLD.w;
  const H = WORLD.h - GROUND_Y;
  const px = new Px(W, H);
  const at = (x: number, y: number): Pt => [x, y + GROUND_Y];

  // masks first so edges can look at their neighbours
  const road = new Float32Array(W * H);
  const water = new Uint8Array(W * H);
  const plaza = new Float32Array(W * H);
  const channel = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = at(x, y);
      const i = y * W + x;
      road[i] = roadDistance(p);
      plaza[i] = ellipseValue(p, PLAZA);
      const dr = distToPolyline(p, RIVER.pts);
      const inPond = ellipseValue(p, POND);
      water[i] = dr < RIVER.w / 2 || inPond < 1 ? 1 : 0;
      channel[i] = Math.min(dr / (RIVER.w / 2), Math.sqrt(inPond));
    }
  const isWater = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H ? water[y * W + x] === 1 : false;
  const isRoad = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H ? road[y * W + x]! < 0 : false;

  const hill = noise1(1024, 64, 301);
  const hillFine = noise1(1024, 16, 302);
  const wave = noise1(1024, 32, 303);

  for (let y = 0; y < H; y++) {
    const wy = y + GROUND_Y;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      // horizon hills overlap the forest silhouette
      const top = 6 + hill(x) * 10 + hillFine(x) * 3;
      if (y < top) continue;
      const depthFromTop = y - top;
      let c: Color;

      if (water[i]) {
        c = ice(x, y, channel[i]!, wy);
        // bank face where land is just above: the drop down to the ice
        if (!isWater(x, y - 1)) c = C.snow2;
        else if (!isWater(x, y - 2)) c = C.snow1;
        else if (!isWater(x, y - 3)) c = bayer(x, y) < 0.5 ? C.snow0 : C.ice1;
        else if (!isWater(x, y + 1)) c = C.ice4; // rim where the ice meets the lower bank
      } else if (plaza[i]! < 1) {
        c = cobbles(x, wy, plaza[i]!);
      } else if (road[i]! < 0) {
        c = bayer(x, y) < 0.55 ? C.snow2 : C.snow3;
        if (vnoise(x, wy, 9, 31) > 0.72 && bayer(x, y) < 0.5) c = C.snow3;
        if (!isRoad(x, y - 1)) c = C.snow1;
        else if (!isRoad(x, y - 2)) c = bayer(x, y) < 0.5 ? C.snow1 : C.snow2;
        if (!isRoad(x, y + 1)) c = C.snow4;
        else if (!isRoad(x, y + 2) && bayer(x, y) < 0.5) c = C.snow4;
      } else {
        // open snow: broad soft drifts + wind-combed crests
        const n = vnoise(x, wy, 70, 11) * 0.65 + vnoise(x, wy, 23, 12) * 0.35;
        c = C.snow3;
        if (n > 0.6 && bayer(x, y) < (n - 0.6) * 3.2) c = C.snow4;
        if (n < 0.34 && bayer(x, y) < (0.34 - n) * 2.4) c = C.snow2;
        const band = Math.floor((wy + wave(x) * 12) / 29);
        const ph = (wy + wave(x) * 12 + wave(x * 0.7 + band * 37) * 9) % 29;
        if (wave(x * 1.3 + band * 53 + 11) > 0.64) {
          if (ph < 1) c = C.snow4;
          else if (ph < 2 && bayer(x, y) < 0.5) c = C.snow2;
        }
        // kicked-up snow banks beside the roads
        const rd = road[i]!;
        if (rd < 2.2) c = bayer(x, y) < 0.6 ? C.snow4 : C.snow5;
        // lip of snow overhanging the frozen water
        if (isWater(x, y + 1)) c = C.snow5;
        else if (isWater(x, y + 2) && bayer(x, y) < 0.5) c = C.snow4;
      }
      // forest shade along the northern edge and darker borders framing the map
      if (depthFromTop < 2) c = C.snow3;
      const edge = Math.max(
        (34 - depthFromTop) / 34,
        (26 - x) / 26,
        (x - (W - 26)) / 26,
        (y - (H - 30)) / 30,
      );
      if (edge > 0 && bayer(x, y) < edge * 0.55 && !water[i]) c = c === C.snow4 ? C.snow3 : C.snow2;
      px.set(x, y, c);
    }
  }

  // moon reflection on the pond, glints, old footprints along the roads
  const mx = POND.cx - 34;
  const my = POND.cy - 14 - GROUND_Y;
  for (let j = -3; j <= 12; j++)
    for (let i = -6; i <= 6; i++) {
      const x = mx + i;
      const y = my + j;
      if (!isWater(x, y) || !isWater(x, y - 3)) continue;
      const disc = (i / 5.5) ** 2 + (j / 3) ** 2 < 1;
      const streak = j > 2 && Math.abs(i) < 3 - j / 5 && (j + i) % 2 === 0;
      if (disc) px.set(x, y, bayer(x, y) < 0.7 ? C.moonShade : C.moon);
      else if (streak) px.set(x, y, C.ice4);
    }
  const r = rng(909);
  for (let k = 0; k < 900; k++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * H);
    const i = y * W + x;
    if (!px.alphaAt(x, y)) continue;
    if (water[i]) {
      if (r() < 0.3) px.set(x, y, C.ice4);
    } else if (road[i]! < -1 && plaza[i]! >= 1) {
      if (isRoad(x + 1, y) && isRoad(x, y - 2) && isRoad(x, y + 2)) {
        px.set(x, y, C.snow1);
        px.set(x + 1, y, C.snow2);
      }
    } else if (road[i]! > 3 && plaza[i]! > 1.2) px.set(x, y, C.snow5);
  }
  return px;
}

function ice(x: number, y: number, ch: number, wy: number): Color {
  let c: Color = C.ice2;
  if ((x * 2 - y * 3 + Math.floor(vnoise(x, wy, 12, 41) * 9)) % 23 === 0) c = C.ice3;
  const drift = vnoise(x, wy, 14, 42);
  if (drift > 0.78 && bayer(x, y) < 0.6)
    c = C.snow3; // snow blown onto the ice
  else if (drift > 0.66 && bayer(x, y) < 0.4) c = C.ice3;
  if (ch < 0.36 && vnoise(x, wy, 10, 43) > 0.35) c = bayer(x, y) < 0.8 ? C.ice0 : C.ice1; // open dark water
  if (ch > 0.8 && bayer(x, y) < 0.5) c = C.ice1;
  return c;
}

function cobbles(x: number, wy: number, v: number): Color {
  // curb ring of larger stones at the plaza edge
  if (v > 0.86) return v > 0.93 ? (bayer(x, wy) < 0.5 ? C.snow4 : C.snow5) : C.stone3;
  const row = Math.floor(wy / 4);
  const u = (x + (row % 2) * 3) % 7;
  const vy = wy % 4;
  const snow = vnoise(x, wy, 9, 51) * 0.6 + vnoise(x, wy, 4, 52) * 0.4;
  if (snow > 0.6) return snow > 0.66 || bayer(x, wy) < 0.5 ? C.snow4 : C.snow3;
  if (u === 6 || vy === 3) return snow > 0.42 ? C.snow3 : C.stone1; // snow-filled joints
  const tone = hash(Math.floor((x + (row % 2) * 3) / 7), row, 53) < 0.3 ? 1 : 2;
  if (vy === 0 || u === 0) return tone === 1 ? C.stone2 : C.stone3;
  if (vy === 2 && u === 5) return C.stone1;
  return tone === 1 ? C.stone1 : C.stone2;
}
