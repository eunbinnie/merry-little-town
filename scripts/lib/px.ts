// Tiny RGBA pixel canvas + PNG encoder for programmatic pixel art.
// Runs on plain Node (type stripping), so: no enums, no parameter properties, `.ts` imports only.
import { crc32, deflateSync } from "node:zlib";

/** "#rrggbb" or "#rrggbbaa". */
export type Color = string;
type RGBA = readonly [number, number, number, number];

const cache = new Map<Color, RGBA>();
function rgba(c: Color): RGBA {
  let v = cache.get(c);
  if (!v) {
    const n = c.replace("#", "");
    v = [
      parseInt(n.slice(0, 2), 16),
      parseInt(n.slice(2, 4), 16),
      parseInt(n.slice(4, 6), 16),
      n.length === 8 ? parseInt(n.slice(6, 8), 16) : 255,
    ];
    cache.set(c, v);
  }
  return v;
}

export class Px {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  /** Alpha-over a pixel. Out-of-bounds writes are ignored. */
  set(x: number, y: number, c: Color, alpha = 1): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, a0] = rgba(c);
    const a = (a0 / 255) * alpha;
    const i = (y * this.w + x) * 4;
    const d = this.data;
    const da = d[i + 3]! / 255;
    const oa = a + da * (1 - a);
    if (oa <= 0) return;
    d[i] = (r * a + d[i]! * da * (1 - a)) / oa;
    d[i + 1] = (g * a + d[i + 1]! * da * (1 - a)) / oa;
    d[i + 2] = (b * a + d[i + 2]! * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  }

  erase(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data.fill(0, (y * this.w + x) * 4, (y * this.w + x) * 4 + 4);
  }

  alphaAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3]!;
  }

  rect(x: number, y: number, w: number, h: number, c: Color, alpha = 1): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c, alpha);
  }

  hline(x0: number, x1: number, y: number, c: Color): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
  }

  vline(x: number, y0: number, y1: number, c: Color): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, c: Color): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Scanline polygon fill (pixel-center sampling, no anti-aliasing). */
  poly(
    pts: ReadonlyArray<readonly [number, number]>,
    c: Color | ((x: number, y: number) => Color | null),
  ): void {
    const ys = pts.map((p) => p[1]);
    const minY = Math.floor(Math.min(...ys));
    const maxY = Math.ceil(Math.max(...ys));
    for (let y = minY; y <= maxY; y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i]!;
        const [bx, by] = pts[(i + 1) % pts.length]!;
        if (ay === by) continue;
        if (cy < Math.min(ay, by) || cy >= Math.max(ay, by)) continue;
        xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k]! - 0.5); x <= Math.floor(xs[k + 1]! - 0.5); x++) {
          const col = typeof c === "function" ? c(x, y) : c;
          if (col) this.set(x, y, col);
        }
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color, alpha = 1): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, c, alpha);
      }
    }
  }

  /** Draw a palette map. '.' and ' ' are transparent. */
  map(x: number, y: number, rows: readonly string[], pal: Readonly<Record<string, Color>>): void {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i]!;
        if (ch === "." || ch === " ") continue;
        const c = pal[ch];
        if (!c) throw new Error(`palette has no '${ch}'`);
        this.set(x + i, y + j, c);
      }
    });
  }

  /** Alpha-over another canvas. */
  blit(src: Px, dx: number, dy: number, opts: { flipX?: boolean; alpha?: number } = {}): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const sx = opts.flipX ? src.w - 1 - x : x;
        const i = (y * src.w + sx) * 4;
        const a = src.data[i + 3]!;
        if (!a) continue;
        const d = src.data;
        const hex =
          "#" +
          [d[i]!, d[i + 1]!, d[i + 2]!, a].map((v) => v.toString(16).padStart(2, "0")).join("");
        this.set(dx + x, dy + y, hex, opts.alpha ?? 1);
      }
    }
  }

  /** 1px outline around opaque pixels (4-neighbour). */
  outline(c: Color): void {
    const solid = (x: number, y: number) => this.alphaAt(x, y) > 128;
    const pts: Array<[number, number]> = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (
          !solid(x, y) &&
          (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))
        )
          pts.push([x, y]);
    for (const [x, y] of pts) this.set(x, y, c);
  }

  /** Copy a region into a new canvas. */
  crop(x: number, y: number, w: number, h: number): Px {
    const out = new Px(w, h);
    for (let j = 0; j < h; j++) {
      const from = ((y + j) * this.w + x) * 4;
      out.data.set(this.data.subarray(from, from + w * 4), j * w * 4);
    }
    return out;
  }

  /** Nearest-neighbour upscale. */
  scale(k: number): Px {
    const out = new Px(this.w * k, this.h * k);
    for (let y = 0; y < out.h; y++)
      for (let x = 0; x < out.w; x++) {
        const s = (Math.floor(y / k) * this.w + Math.floor(x / k)) * 4;
        out.data.set(this.data.subarray(s, s + 4), (y * out.w + x) * 4);
      }
    return out;
  }

  png(): Buffer {
    return encodePng(this.w, this.h, this.data);
  }
}

function chunk(type: string, body: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}

export function encodePng(w: number, h: number, data: Uint8ClampedArray): Buffer {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Deterministic PRNG so every generation run produces identical art. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth periodic 1D value noise in [0, 1). `period` must be a multiple of `step`. */
export function noise1(period: number, step: number, seed: number): (x: number) => number {
  const r = rng(seed);
  const n = period / step;
  const pts = Array.from({ length: n }, () => r());
  return (x: number) => {
    const t = (((x % period) + period) % period) / step;
    const i = Math.floor(t);
    const f = t - i;
    const s = f * f * (3 - 2 * f);
    return pts[i % n]! * (1 - s) + pts[(i + 1) % n]! * s;
  };
}

/** 4x4 Bayer threshold in [0, 1). Use for ordered dithering between two colours. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x: number, y: number): number {
  return BAYER[((y & 3) << 2) | (x & 3)]! / 16;
}
