// Playable Santa: sprite + ground shadow, path following, 4-way facing,
// footprints in the snow and little puffs where his boots land.
import * as Phaser from "phaser";
import { SANTA_META } from "@/constants/sprites";
import { BRIDGE, PLAZA, ellipseValue, inRect, type Pt } from "./world";
import type { Grid } from "./grid";

export type Facing = "s" | "n" | "e" | "w";
const SHEET = "characters/santa.png";
const SPEED = 66; // art px per second
const STEP = 7; // footprint spacing

export function createSantaAnims(scene: Phaser.Scene): void {
  for (const [name, frames] of Object.entries(SANTA_META.anims)) {
    const idle = name.startsWith("idle");
    scene.anims.create({
      key: `santa-${name}`,
      frames: frames.map((frame, i) => ({
        key: SHEET,
        frame,
        // long rest on the open-eyed frame, a quick blink
        duration: idle && frames.length > 1 ? (i === 0 ? 2600 : 40) : undefined,
      })),
      frameRate: name.startsWith("walk") ? 9 : name.startsWith("cheer") ? 4 : 8,
      repeat: name.startsWith("place") ? 0 : -1,
    });
  }
}

export class Santa {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly prints: Phaser.GameObjects.Image[] = [];
  private printIndex = 0;
  private printSide = 1;
  private travelled = 0;
  private readonly puff: Phaser.GameObjects.Particles.ParticleEmitter;
  private path: Pt[] = [];
  private onArrive: (() => void) | null = null;
  facing: Facing = "s";
  full = false;
  x: number;
  y: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: Grid,
    at: Pt,
  ) {
    [this.x, this.y] = at;
    this.shadow = scene.add.image(0, 0, "effects/shadow-santa.png").setDepth(-60);
    this.sprite = scene.add.sprite(0, 0, SHEET, 0).setOrigin(0.5, SANTA_META.footY / SANTA_META.h);
    for (let i = 0; i < 64; i++)
      this.prints.push(
        scene.add.image(0, 0, "effects/footprint-v.png").setDepth(-80).setVisible(false),
      );
    this.puff = scene.add.particles(0, 0, "effects/dot.png", {
      emitting: false,
      lifespan: 420,
      speed: { min: 5, max: 16 },
      angle: { min: 200, max: 340 },
      gravityY: 36,
      alpha: { start: 0.9, end: 0 },
    });
    this.place(at);
    this.idle();
  }

  get moving(): boolean {
    return this.path.length > 0;
  }

  place([x, y]: Pt): void {
    this.x = x;
    this.y = y;
    this.sync();
  }

  setVisible(v: boolean): void {
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
  }

  private anim(kind: "idle" | "walk"): void {
    const dir = this.facing === "w" ? "e" : this.facing;
    this.sprite.setFlipX(this.facing === "w");
    this.sprite.play(`santa-${kind}-${dir}-${this.full ? "full" : "empty"}`, true);
  }

  idle(): void {
    this.anim("idle");
  }

  face(f: Facing): void {
    this.facing = f;
    this.anim(this.moving ? "walk" : "idle");
  }

  /** Placing / taking a gift, facing east or west. `frame`: 0 hold, 1 crouch with box, 2 reach. */
  pose(frame: 0 | 1 | 2): void {
    this.sprite.stop();
    this.sprite.setFlipX(this.facing === "w");
    this.sprite.setFrame(SANTA_META.anims["place-e"]![frame]!);
  }

  cheer(): void {
    this.sprite.setFlipX(false);
    this.sprite.play("santa-cheer-s");
  }

  setFull(full: boolean): void {
    if (this.full === full) return;
    this.full = full;
    if (this.sprite.anims.isPlaying) this.anim(this.moving ? "walk" : "idle");
  }

  follow(path: Pt[], onArrive?: () => void): void {
    this.path = path.slice();
    this.onArrive = onArrive ?? null;
    this.anim("walk");
  }

  stop(): void {
    this.path = [];
    this.onArrive = null;
    this.idle();
  }

  /** Direct (keyboard) movement; returns whether Santa moved. */
  nudge(dx: number, dy: number, dt: number): boolean {
    if (this.path.length) {
      this.path = [];
      this.onArrive = null;
    }
    const len = Math.hypot(dx, dy) || 1;
    const vx = (dx / len) * SPEED * dt;
    const vy = (dy / len) * SPEED * dt;
    const ok = (x: number, y: number) =>
      this.grid.walkable(x - 3, y) && this.grid.walkable(x + 3, y) && this.grid.walkable(x, y - 2);
    let moved = false;
    if (vx && ok(this.x + vx, this.y)) {
      this.x += vx;
      moved = true;
    }
    if (vy && ok(this.x, this.y + vy)) {
      this.y += vy;
      moved = true;
    }
    this.setFacingFrom(dx, dy);
    if (moved) {
      this.trail(Math.hypot(vx, vy), dx, dy);
      this.anim("walk");
    } else this.idle();
    this.sync();
    return moved;
  }

  update(dt: number): void {
    if (!this.path.length) return;
    let budget = SPEED * dt;
    while (budget > 0 && this.path.length) {
      const [tx, ty] = this.path[0]!;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      if (d <= budget) {
        this.x = tx;
        this.y = ty;
        budget -= d;
        this.path.shift();
        this.trail(d, dx, dy);
      } else {
        this.x += (dx / d) * budget;
        this.y += (dy / d) * budget;
        this.trail(budget, dx, dy);
        budget = 0;
      }
      if (d > 0.01) this.setFacingFrom(dx, dy);
    }
    this.anim(this.path.length ? "walk" : "idle");
    this.sync();
    if (!this.path.length) {
      const done = this.onArrive;
      this.onArrive = null;
      done?.();
    }
  }

  private setFacingFrom(dx: number, dy: number): void {
    // prefer the side views: they read best while walking
    if (Math.abs(dx) >= Math.abs(dy) * 0.75) this.facing = dx > 0 ? "e" : "w";
    else this.facing = dy > 0 ? "s" : "n";
  }

  /** Distance-based footprints, alternating left and right of the walking line. */
  private trail(dist: number, dx: number, dy: number): void {
    this.travelled += dist;
    if (this.travelled < STEP) return;
    this.travelled = 0;
    const p: Pt = [this.x, this.y];
    if (ellipseValue(p, PLAZA) < 1 || inRect(p, BRIDGE.deck)) return; // cobbles and planks
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    this.printSide *= -1;
    const img = this.prints[this.printIndex++ % this.prints.length]!;
    this.scene.tweens.killTweensOf(img);
    img
      .setTexture(
        Math.abs(dx) > Math.abs(dy) ? "effects/footprint-h.png" : "effects/footprint-v.png",
      )
      .setPosition(
        Math.round(this.x + nx * 2 * this.printSide),
        Math.round(this.y + ny * 1.5 * this.printSide),
      )
      .setAlpha(0.9)
      .setVisible(true);
    this.scene.tweens.add({ targets: img, alpha: 0, delay: 2600, duration: 5200 });
    this.puff.setDepth(this.y + 0.5);
    this.puff.emitParticleAt(this.x, this.y, 2);
  }

  private sync(): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    this.sprite.setPosition(x, y).setDepth(this.y);
    this.shadow.setPosition(x, y);
  }
}
