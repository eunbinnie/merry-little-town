// Walkability grid + A* for click-to-move. Pure (no Phaser), tested directly by Node.
import { WALK, WORLD, isWater, type Pt, type Rect } from "./world.ts";

export const CELL = 4;
/** Obstacles grow by this much so Santa's body doesn't overlap walls. */
const PAD_X = 4;
const PAD_Y = 2;

export class Grid {
  readonly cols = Math.ceil(WORLD.w / CELL);
  readonly rows = Math.ceil(WORLD.h / CELL);
  readonly blocked: Uint8Array;

  constructor(obstacles: readonly Rect[]) {
    this.blocked = new Uint8Array(this.cols * this.rows);
    for (let cy = 0; cy < this.rows; cy++)
      for (let cx = 0; cx < this.cols; cx++) {
        const p: Pt = [cx * CELL + CELL / 2, cy * CELL + CELL / 2];
        const out = p[0] < WALK.x0 || p[0] > WALK.x1 || p[1] < WALK.y0 || p[1] > WALK.y1;
        if (out || isWater(p)) this.blocked[cy * this.cols + cx] = 1;
      }
    for (const [x, y, w, h] of obstacles) {
      const c0 = Math.max(0, Math.floor((x - PAD_X) / CELL));
      const c1 = Math.min(this.cols - 1, Math.floor((x + w + PAD_X - 1) / CELL));
      const r0 = Math.max(0, Math.floor((y - PAD_Y) / CELL));
      const r1 = Math.min(this.rows - 1, Math.floor((y + h + PAD_Y - 1) / CELL));
      for (let r = r0; r <= r1; r++)
        this.blocked.fill(1, r * this.cols + c0, r * this.cols + c1 + 1);
    }
  }

  free(cx: number, cy: number): boolean {
    return (
      cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows && !this.blocked[cy * this.cols + cx]
    );
  }

  /** Is this world point walkable? */
  walkable(x: number, y: number): boolean {
    return this.free(Math.floor(x / CELL), Math.floor(y / CELL));
  }

  /** Closest walkable world point (cell centre), searching outwards ring by ring. */
  nearest(x: number, y: number, maxRadius = 40): Pt | null {
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    if (this.free(cx, cy)) return [x, y];
    let best: Pt | null = null;
    let bestD = Infinity;
    for (let r = 1; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !this.free(cx + dx, cy + dy)) continue;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = [(cx + dx) * CELL + CELL / 2, (cy + dy) * CELL + CELL / 2];
          }
        }
      if (best) return best;
    }
    return null;
  }

  /** Straight walk between two points stays on walkable cells. */
  clearLine(a: Pt, b: Pt): boolean {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.ceil(len / (CELL / 2));
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      if (!this.walkable(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
    }
    return true;
  }

  /**
   * Walkable route from `from` to `to` (both world points), smoothed into as
   * few straight legs as possible. An unwalkable target snaps to the nearest
   * walkable spot. Returns null when there's no way through.
   */
  path(from: Pt, to: Pt): Pt[] | null {
    const start = this.nearest(from[0], from[1], 6);
    const goal = this.nearest(to[0], to[1]);
    if (!start || !goal) return null;
    if (this.clearLine(start, goal)) return [goal];
    const cells = this.astar(
      [Math.floor(start[0] / CELL), Math.floor(start[1] / CELL)],
      [Math.floor(goal[0] / CELL), Math.floor(goal[1] / CELL)],
    );
    if (!cells) return null;
    const pts: Pt[] = cells.map(([cx, cy]) => [cx * CELL + CELL / 2, cy * CELL + CELL / 2]);
    pts[pts.length - 1] = goal;
    // string-pulling: skip every waypoint that has a clear line past it
    const out: Pt[] = [];
    let anchor = start;
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.clearLine(anchor, pts[j]!)) j--;
      out.push(pts[j]!);
      anchor = pts[j]!;
      i = j + 1;
    }
    return out;
  }

  private astar(s: Pt, g: Pt): Pt[] | null {
    const { cols } = this;
    const n = cols * this.rows;
    const gScore = new Float32Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const heap: number[] = []; // node indices, ordered by f
    const f = new Float32Array(n);
    const h = (i: number) => {
      const dx = Math.abs((i % cols) - g[0]);
      const dy = Math.abs(Math.floor(i / cols) - g[1]);
      return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };
    const push = (i: number) => {
      heap.push(i);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (f[heap[p]!]! <= f[heap[k]!]!) break;
        [heap[p], heap[k]] = [heap[k]!, heap[p]!];
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0]!;
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = k * 2 + 1;
          const r = l + 1;
          let m = k;
          if (l < heap.length && f[heap[l]!]! < f[heap[m]!]!) m = l;
          if (r < heap.length && f[heap[r]!]! < f[heap[m]!]!) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k]!, heap[m]!];
          k = m;
        }
      }
      return top;
    };
    const si = s[1] * cols + s[0];
    const gi = g[1] * cols + g[0];
    gScore[si] = 0;
    f[si] = h(si);
    push(si);
    while (heap.length) {
      const cur = pop();
      if (cur === gi) {
        const out: Pt[] = [];
        for (let c = cur; c !== -1; c = came[c]!) out.push([c % cols, Math.floor(c / cols)]);
        return out.reverse().slice(1);
      }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % cols;
      const cy = Math.floor(cur / cols);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (!this.free(nx, ny)) continue;
          // no corner cutting
          if (dx && dy && (!this.free(cx + dx, cy) || !this.free(cx, cy + dy))) continue;
          const ni = ny * cols + nx;
          const cand = gScore[cur]! + (dx && dy ? Math.SQRT2 : 1);
          if (cand < gScore[ni]!) {
            gScore[ni] = cand;
            came[ni] = cur;
            f[ni] = cand + h(ni);
            push(ni);
          }
        }
    }
    return null;
  }
}
