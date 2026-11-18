// Building blocks for the houses: wall materials, roofs, windows, doors, snow.
// Moonlight from the upper left: left/top edges catch light, right/bottom edges shade.
import { Px, bayer, noise1, type Color } from "../lib/px.ts";
import { C } from "../lib/palette.ts";

export type R = () => number;

// ---------------------------------------------------------------- walls

export function plaster(
  px: Px,
  x: number,
  y: number,
  w: number,
  h: number,
  r: R,
  tone: readonly Color[] = [C.plaster0, C.plaster1, C.plaster2, C.plaster3],
): void {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let c = tone[2]!;
      const k = r();
      if (k < 0.07) c = tone[1]!;
      else if (k < 0.1) c = tone[3]!;
      if (j >= h - 4 && bayer(i, j) < (j - (h - 5)) / 5) c = tone[1]!; // grime near the ground
      if (i === w - 1) c = tone[1]!;
      px.set(x + i, y + j, c);
    }
}

export function bricks(px: Px, x: number, y: number, w: number, h: number, r: R): void {
  for (let j = 0; j < h; j++) {
    const row = Math.floor(j / 3);
    const v = j % 3;
    for (let i = 0; i < w; i++) {
      const u = (i + (row % 2) * 3) % 6;
      let c: Color;
      if (v === 2 || u === 5) c = C.mortar;
      else {
        const seed = Math.floor((i + (row % 2) * 3) / 6) * 31 + row * 17;
        const dark = ((seed * 2654435761) >>> 0) % 7 === 0;
        c = v === 0 ? (dark ? C.brick1 : C.brick2) : dark ? C.brick0 : C.brick1;
        if (v === 0 && u === 0) c = dark ? C.brick1 : "#8d5450";
      }
      if (i === w - 1 && bayer(i, j) < 0.5) c = C.brick0;
      px.set(x + i, y + j, c);
    }
  }
  void r;
}

/** Irregular fieldstone with highlights on the moon-facing edges. */
export function stones(
  px: Px,
  x: number,
  y: number,
  w: number,
  h: number,
  r: R,
  ramp: readonly Color[] = [C.stone0, C.stone1, C.stone2, C.stone3],
): void {
  px.rect(x, y, w, h, ramp[0]!);
  let j = 0;
  while (j < h) {
    const rh = 3 + Math.floor(r() * 2);
    let i = -Math.floor(r() * 4);
    while (i < w) {
      const sw = 4 + Math.floor(r() * 5);
      const tone = r() < 0.2 ? 1 : r() < 0.85 ? 2 : 3;
      for (let b = 0; b < rh - 1; b++)
        for (let a = 0; a < sw - 1; a++) {
          const xx = i + a;
          const yy = j + b;
          if (xx < 0 || xx >= w || yy >= h) continue;
          // rounded corners
          if ((a === 0 || a === sw - 2) && (b === 0 || b === rh - 2)) continue;
          let c = ramp[tone]!;
          if (b === 0 || a === 0) c = ramp[Math.min(3, tone + 1)]!;
          if (b === rh - 2 || a === sw - 2) c = ramp[Math.max(1, tone - 1)]!;
          px.set(x + xx, y + yy, c);
        }
      i += sw;
    }
    j += rh;
  }
}

/** Horizontal log courses with round log ends poking out at the corners. */
export function logs(px: Px, x: number, y: number, w: number, h: number, r: R): void {
  for (let j = 0; j < h; j++) {
    const v = j % 4;
    for (let i = 0; i < w; i++) {
      let c: Color = [C.wood4, C.wood3, C.wood2, C.wood1][v]!;
      if (v === 1 && r() < 0.06) c = C.wood2;
      if (v === 2 && bayer(i, j) < 0.25) c = C.wood3;
      if (i >= w - 2 && v < 3) c = v === 0 ? C.wood3 : C.wood2;
      px.set(x + i, y + j, c);
    }
  }
  for (let j = 0; j + 3 <= h; j += 4)
    for (const ex of [x - 2, x + w - 1]) {
      px.map(ex, y + j, [".aa.", "abca", ".aa."], { a: C.wood3, b: C.wood5, c: C.wood2 });
    }
}

export function boards(
  px: Px,
  x: number,
  y: number,
  w: number,
  h: number,
  mask?: (x: number, y: number) => boolean,
): void {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if (mask && !mask(x + i, y + j)) continue;
      const u = i % 4;
      px.set(x + i, y + j, u === 3 ? C.wood1 : u === 0 ? C.wood3 : C.wood2);
    }
}

// ---------------------------------------------------------------- roofs

type Ramp = readonly [Color, Color, Color, Color]; // dark → light

export const RED_TILES: Ramp = [C.red0, C.red1, C.red2, C.red3];
export const SLATE: Ramp = [C.slate0, C.slate1, C.slate2, C.slate3];
export const SHINGLE: Ramp = [C.wood0, C.wood1, C.wood2, C.wood3];

/** Side-gable roof seen front-on: a trapezoid of tile rows under a snow blanket. */
export function trapRoof(
  px: Px,
  o: {
    x0: number;
    x1: number;
    eaveY: number;
    ridgeY: number;
    inset: number;
    ramp: Ramp;
    snow: number;
    tileW?: number;
    r: R;
    seed: number;
    mound?: number;
  },
): (x: number) => number {
  const { x0, x1, eaveY, ridgeY, inset, ramp } = o;
  const tw = o.tileW ?? 4;
  const H = eaveY - ridgeY;
  const edgeL = (y: number) => x0 + inset * (1 - (y - ridgeY) / H);
  const edgeR = (y: number) => x1 - inset * (1 - (y - ridgeY) / H);
  for (let y = ridgeY; y < eaveY; y++) {
    const row = Math.floor((y - ridgeY) / 3);
    const v = (y - ridgeY) % 3;
    for (let x = Math.ceil(edgeL(y)); x <= Math.floor(edgeR(y)); x++) {
      const u = (((x + (row % 2) * (tw >> 1)) % tw) + tw) % tw;
      let c = v === 2 ? ramp[0] : u === 0 ? ramp[1] : v === 0 ? ramp[3] : ramp[2];
      if (x <= Math.ceil(edgeL(y))) c = ramp[3];
      if (x >= Math.floor(edgeR(y))) c = ramp[0];
      px.set(x, y, c);
    }
  }
  // eave fascia
  px.hline(x0, x1, eaveY, ramp[0]);
  // snow blanket from the ridge down, with a wavy hem
  const hem = noise1(512, 4, o.seed);
  const lump = noise1(512, 8, o.seed + 9);
  const snowLine = (x: number) => ridgeY + o.snow + Math.round(hem(x) * 2 + lump(x) * 3 - 2);
  for (let x = x0; x <= x1; x++) {
    const sl = snowLine(x);
    for (let y = ridgeY - (o.mound ?? 1); y < Math.min(sl, eaveY); y++) {
      const insideY = y >= ridgeY;
      const l = insideY ? edgeL(y) : x0 + inset + 1;
      const rr = insideY ? edgeR(y) : x1 - inset - 1;
      if (x < Math.ceil(l) - 1 || x > Math.floor(rr) + 1) continue;
      // rounded mound above the ridge
      if (!insideY) {
        const lift = ridgeY - y;
        if (x < l + lift * 2 || x > rr - lift * 2) continue;
      }
      const d = sl - y;
      let c: Color = C.snow5;
      if (y === ridgeY - (o.mound ?? 1) || (!insideY && bayer(x, y) < 0.5)) c = C.snow6;
      // wind ripples: faint shaded lines that follow the slope
      if (
        insideY &&
        d > 3 &&
        (y - ridgeY + Math.round(lump(x * 2) * 3)) % 5 === 4 &&
        bayer(x, y) < 0.6
      )
        c = C.snow4;
      if (d <= 1)
        c = C.snow3; // hem shadow
      else if (d <= 2) c = C.snow4;
      const t = (x - x0) / (x1 - x0);
      if (t > 0.72 && c === C.snow5 && bayer(x, y) < Math.min(1, (t - 0.72) * 5)) c = C.snow4;
      if (t > 0.88 && c === C.snow4 && d > 2 && bayer(x, y) < 0.35) c = C.snow3;
      if (x <= Math.ceil(l)) c = C.snow6;
      px.set(x, y, c);
    }
  }
  // snow lip hanging over the eave
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    px.set(x, eaveY - 1, C.snow5);
    px.set(x, eaveY, x > (x0 + x1) / 2 ? C.snow3 : C.snow4);
  }
  icicles(px, x0, x1, eaveY + 1, o.r, 0.35);
  return snowLine;
}

/** Front gable: a sloped roof band (with snow on top) framing a triangle of wall. */
export function gableRoof(
  px: Px,
  o: {
    apexX: number;
    apexY: number;
    xl: number;
    xr: number;
    eaveY: number;
    th: number;
    ramp: Ramp;
    snow: number;
    trim?: Color;
    r: R;
  },
): (x: number) => number {
  const { apexX, apexY, xl, xr, eaveY, th, ramp } = o;
  const outer = (x: number) =>
    x <= apexX
      ? eaveY - ((x - xl) / (apexX - xl)) * (eaveY - apexY)
      : eaveY - ((xr - x) / (xr - apexX)) * (eaveY - apexY);
  for (let x = xl; x <= xr; x++) {
    const y0 = Math.round(outer(x));
    const left = x <= apexX;
    for (let k = 0; k < th; k++) {
      const c =
        k === th - 1 ? (o.trim ?? ramp[0]) : k === 0 ? ramp[left ? 3 : 2] : ramp[left ? 2 : 1];
      px.set(x, y0 + k, (x + k) % 3 === 0 && k > 0 && k < th - 1 ? ramp[0] : c);
    }
    // snow riding on top of the slope
    const s = o.snow + ((x * 7) % 5 === 0 ? 1 : 0);
    for (let k = 1; k <= s; k++)
      px.set(x, y0 - k, k === s ? (left ? C.snow6 : C.snow5) : left ? C.snow5 : C.snow4);
    px.set(x, y0, left ? C.snow4 : C.snow3);
  }
  // fill gaps the column sweep leaves on steep slopes
  for (let x = xl; x <= xr; x++) {
    const a = Math.round(outer(x));
    const b = Math.round(outer(x + (x < apexX ? 1 : -1)));
    for (let y = Math.min(a, b) - o.snow; y < Math.max(a, b) - o.snow; y++)
      if (!px.alphaAt(x, y)) px.set(x, y, x <= apexX ? C.snow6 : C.snow5);
  }
  icicles(px, xl, xl + 3, eaveY + th, o.r, 0.6);
  icicles(px, xr - 3, xr, eaveY + th, o.r, 0.6);
  return outer;
}

export function icicles(px: Px, x0: number, x1: number, y: number, r: R, density: number): void {
  for (let x = x0; x <= x1; x++) {
    if (r() > density) continue;
    const len = 1 + Math.floor(r() * 3.2);
    for (let k = 0; k < len; k++) px.set(x, y + k, k === len - 1 ? C.snow3 : C.snow5);
  }
}

export function chimney(
  px: Px,
  x: number,
  y: number,
  w: number,
  h: number,
  r: R,
  kind: "brick" | "stone",
): [number, number] {
  if (kind === "brick") bricks(px, x, y + 3, w, h - 3, r);
  else stones(px, x, y + 3, w, h - 3, r);
  // cap
  px.rect(x - 1, y + 2, w + 2, 2, kind === "brick" ? C.brick0 : C.stone1);
  px.hline(x - 1, x + w, y + 2, kind === "brick" ? C.brick2 : C.stone3);
  // snow cap
  px.rect(x - 1, y, w + 2, 2, C.snow5);
  px.hline(x, x + w - 1, y - 1, C.snow6);
  px.set(x + w, y + 1, C.snow3);
  // flue opening
  px.rect(x + 1, y, w - 2, 1, C.outline);
  // shadow side
  px.vline(x + w - 1, y + 4, y + h - 1, kind === "brick" ? C.brick0 : C.stone0);
  return [x + Math.floor(w / 2), y - 1];
}

// ---------------------------------------------------------------- openings

export type Win = {
  x: number;
  y: number;
  w: number; // outer size including frame
  h: number;
  frame: Color;
  frameShade: Color;
  mullion?: "cross" | "v" | "grid" | "none";
  arch?: boolean;
  round?: boolean;
  shutters?: readonly [Color, Color];
  sill?: boolean;
  curtains?: boolean;
};

function glassMask(win: Win): (i: number, j: number) => boolean {
  const gw = win.w - 2;
  const gh = win.h - 2;
  return (i, j) => {
    if (i < 0 || j < 0 || i >= gw || j >= gh) return false;
    if (win.round) {
      const nx = (i + 0.5 - gw / 2) / (gw / 2);
      const ny = (j + 0.5 - gh / 2) / (gh / 2);
      return nx * nx + ny * ny <= 1.05;
    }
    if (win.arch && j === 0 && (i === 0 || i === gw - 1)) return false;
    return true;
  };
}

function isMullion(win: Win, i: number, j: number): boolean {
  const gw = win.w - 2;
  const gh = win.h - 2;
  const m = win.mullion ?? "cross";
  const mx = Math.floor((gw - 1) / 2);
  const my = Math.floor(gh * 0.45);
  if (m === "none") return false;
  if (m === "v") return i === mx;
  if (m === "cross") return i === mx || j === my;
  return i % 3 === 2 || j % 3 === 2; // grid
}

export function windowDark(px: Px, win: Win): void {
  const { x, y, w, h } = win;
  const inGlass = glassMask(win);
  // frame
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if (inGlass(i - 1, j - 1)) continue;
      const near =
        inGlass(i - 2, j - 1) ||
        inGlass(i, j - 1) ||
        inGlass(i - 1, j - 2) ||
        inGlass(i - 1, j) ||
        inGlass(i - 2, j - 2) ||
        inGlass(i, j);
      if (!near && (win.round || win.arch)) continue;
      px.set(x + i, y + j, i === w - 1 || j === h - 1 ? win.frameShade : win.frame);
    }
  // glass with a cold moon reflection on the upper left
  const gw = w - 2;
  const gh = h - 2;
  for (let j = 0; j < gh; j++)
    for (let i = 0; i < gw; i++) {
      if (!inGlass(i, j)) continue;
      let c: Color = j < 1 ? C.glass0 : C.glass1; // recess shadow under the lintel
      const diag = i + j;
      if (diag >= 2 && diag <= 3) c = C.glass2;
      if (diag === 3 && i < gw / 2) c = C.glass3;
      if (j >= gh - 1) c = C.glass0;
      if (isMullion(win, i, j)) c = win.frame;
      px.set(x + 1 + i, y + 1 + j, c);
    }
  if (win.shutters) {
    const [d, l] = win.shutters;
    for (const sx of [x - 3, x + w]) {
      for (let j = 0; j < h; j++)
        for (let i = 0; i < 3; i++)
          px.set(sx + i, y + j, j === 0 || j === h - 1 || i === 1 ? d : l);
      px.hline(sx, sx + 2, y + Math.floor(h / 2), d);
      px.hline(sx, sx + 2, y - 1, C.snow5);
    }
  }
  if (win.sill !== false) {
    px.hline(x - 1, x + w, y + h, win.frameShade);
    px.hline(x - 1, x + w, y + h - 1, win.frame);
    px.hline(x - 1, x + w - 1, y + h - 2, C.snow5); // snow on the sill
    px.set(x + w, y + h - 2, C.snow3);
  }
}

/** Warm interior light for the same window rect (drawn on the lit layer). */
export function windowLit(px: Px, win: Win): void {
  const { x, y, w, h } = win;
  const inGlass = glassMask(win);
  const gw = w - 2;
  const gh = h - 2;
  for (let j = 0; j < gh; j++)
    for (let i = 0; i < gw; i++) {
      if (!inGlass(i, j)) continue;
      const cx = Math.abs(i + 0.5 - gw / 2) / (gw / 2);
      const cy = (j + 0.5) / gh;
      const v = cx * 0.55 + cy * 0.6;
      let c: Color = v < 0.3 ? C.lit4 : v < 0.62 ? C.lit3 : v < 0.92 ? C.lit2 : C.lit1;
      if (j === 0) c = C.lit1;
      const curtainEdge = Math.max(1, Math.floor(gw / 5));
      if (win.curtains !== false && !win.round && gw >= 5) {
        const cl = i < curtainEdge - (j > gh * 0.55 ? 1 : 0);
        const cr = i >= gw - curtainEdge + (j > gh * 0.55 ? 1 : 0);
        if (cl || cr) c = (cl ? i : gw - 1 - i) === 0 ? C.curtain0 : C.curtain1;
      }
      if (isMullion(win, i, j)) c = C.wood1;
      px.set(x + 1 + i, y + 1 + j, c);
    }
  if (win.sill !== false) {
    // warm light on the sill snow
    px.hline(x - 1, x + w - 1, y + h - 2, C.gold4);
  }
}

export type Door = {
  x: number;
  y: number;
  w: number;
  h: number;
  body: readonly [Color, Color, Color];
  frame: Color;
  arch?: boolean;
  window?: boolean;
};

export function door(px: Px, d: Door): void {
  const { x, y, w, h, body } = d;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if (d.arch && j < 2 && (i === 0 || i === w - 1)) continue;
      if (d.arch && j === 0 && (i === 1 || i === w - 2)) continue;
      const edge =
        i === 0 || i === w - 1 || j === 0 || (d.arch && j === 1 && (i === 1 || i === w - 2));
      if (edge) {
        px.set(x + i, y + j, d.frame);
        continue;
      }
      const plank = (i - 1) % 3;
      let c = plank === 2 ? body[0] : plank === 0 ? body[2] : body[1];
      if (j === 2) c = body[0]; // shadow under the lintel
      px.set(x + i, y + j, c);
    }
  // cross brace + handle
  px.hline(x + 1, x + w - 2, y + Math.floor(h * 0.62), body[0]);
  px.set(x + w - 3, y + Math.floor(h * 0.55), C.gold2);
  px.set(x + w - 3, y + Math.floor(h * 0.55) + 1, C.gold0);
  if (d.window) {
    const wx = x + Math.floor(w / 2) - 1;
    px.rect(wx, y + 3, 3, 3, C.glass1);
    px.set(wx, y + 3, C.glass2);
  }
}

/** Little door window lit from inside. */
export function doorLit(px: Px, d: Door): void {
  if (!d.window) return;
  const wx = d.x + Math.floor(d.w / 2) - 1;
  px.rect(wx, d.y + 3, 3, 3, C.lit3);
  px.set(wx + 1, d.y + 3, C.lit4);
}

// ---------------------------------------------------------------- ground

/** Snow piled against the foot of a building. */
export function drift(
  px: Px,
  x0: number,
  x1: number,
  baseY: number,
  seed: number,
  height = 3,
): void {
  const n = noise1(512, 4, seed);
  const mid = (x0 + x1) / 2;
  for (let x = x0; x <= x1; x++) {
    const edge = Math.min(x - x0, x1 - x) / 3;
    const hh = Math.max(1, Math.round(Math.min(edge, 1) * (height + n(x) * 2.5)));
    for (let k = 0; k < hh; k++) {
      const y = baseY - k;
      let c: Color = k === hh - 1 ? C.snow6 : C.snow5;
      if (x > mid + (x1 - x0) * 0.2 && k < hh - 1) c = C.snow4;
      if (k === 0) c = hh > 2 ? C.snow4 : C.snow3; // melt into the field
      if (k === 0 && bayer(x, y) < 0.5) c = C.snow3;
      px.set(x, y, c);
    }
  }
}

/** Soft blue shadow cast onto the snow to the lower right of a building. */
export function castShadow(px: Px, x0: number, x1: number, y: number, len: number): void {
  for (let j = 0; j < len; j++)
    for (let x = x0 + j * 2; x <= x1 + j * 2 + 3; x++) {
      if (bayer(x, y + j) < 0.5 - j * 0.12) px.set(x, y + j, C.snow1, 0.55);
    }
}

/** Warm light pooling on the snow below a window or door (lit layer). */
export function lightPool(px: Px, cx: number, y: number, rx: number, ry: number): void {
  for (let j = -ry; j <= ry; j++)
    for (let i = -rx; i <= rx; i++) {
      const d = (i / (rx + 0.5)) ** 2 + (j / (ry + 0.5)) ** 2;
      if (d > 1) continue;
      px.set(cx + i, y + j, d < 0.4 ? C.gold3 : C.gold2, d < 0.4 ? 0.42 : 0.24);
    }
}
