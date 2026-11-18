// Rudolph + sleigh: a ground point with a separate altitude, so the shadow
// stays on the snow while the team climbs, cruises and lands.
import * as Phaser from "phaser";
import { SLEIGH_META } from "@/constants/sprites";
import type { Pt } from "./world";

const SHEET = "characters/sleigh.png";
type Pose = "fly-santa" | "fly-empty" | "park-empty" | "park-santa";

export function createSleighAnims(scene: Phaser.Scene): void {
  for (const [name, frames] of Object.entries(SLEIGH_META.anims))
    scene.anims.create({
      key: `sleigh-${name}`,
      frames: frames.map((frame) => ({ key: SHEET, frame })),
      frameRate: name.startsWith("fly") ? 10 : 1.2,
      repeat: -1,
    });
}

export class Sleigh {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly nose: Phaser.GameObjects.Image;
  /** A faint trail of gold behind the flying team, and a puff of snow on landing. */
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly puff: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastDust = 0;
  gx: number;
  gy: number;
  alt = 0;
  dir: 1 | -1 = 1;
  rider = false;

  constructor(
    private readonly scene: Phaser.Scene,
    at: Pt,
  ) {
    [this.gx, this.gy] = at;
    this.shadow = scene.add.image(0, 0, "effects/shadow-sleigh.png").setDepth(-60);
    this.sprite = scene.add
      .sprite(0, 0, SHEET, 0)
      .setOrigin(0.5, SLEIGH_META.groundY / SLEIGH_META.h);
    this.nose = scene.add
      .image(0, 0, "effects/glow-red.png")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(9500)
      .setAlpha(0.8);
    scene.tweens.add({ targets: this.nose, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    this.dust = scene.add.particles(0, 0, "effects/dot.png", {
      emitting: false,
      lifespan: { min: 500, max: 900 },
      speed: { min: 2, max: 7 },
      gravityY: 5,
      alpha: { start: 0.85, end: 0 },
      tint: [0xf4cf83, 0xfbe8b8, 0xfff4d6],
      blendMode: Phaser.BlendModes.ADD,
    });
    this.puff = scene.add.particles(0, 0, "effects/flake.png", {
      emitting: false,
      speed: { min: 10, max: 30 },
      angle: { min: 190, max: 350 },
      lifespan: 600,
      gravityY: 40,
      alpha: { start: 1, end: 0 },
    });
    this.park();
  }

  pose(p: Pose): void {
    this.sprite.play(`sleigh-${p}`, true);
  }

  park(): void {
    this.alt = 0;
    this.pose(this.rider ? "park-santa" : "park-empty");
    this.sync();
  }

  /** Visual centre of the team in world space (for the camera). */
  get visual(): Pt {
    return [this.gx, this.gy - this.alt - 14];
  }

  /** Where a dropped gift leaves the sleigh (the cargo at the back). */
  get cargo(): Pt {
    return [this.gx - this.dir * 30, this.gy - this.alt - 12];
  }

  sync(): void {
    const x = Math.round(this.gx);
    this.sprite
      .setPosition(x, Math.round(this.gy - this.alt))
      .setFlipX(this.dir < 0)
      .setDepth(this.gy + 1);
    const lift = Math.min(1, this.alt / 180);
    this.shadow
      .setPosition(x, Math.round(this.gy))
      .setScale(1 - lift * 0.45, 1 - lift * 0.3)
      .setAlpha(1 - lift * 0.75);
    const [nx, ny] = SLEIGH_META.nose;
    this.nose.setPosition(
      x + this.dir * (nx - SLEIGH_META.w / 2),
      Math.round(this.gy - this.alt) + ny - SLEIGH_META.groundY,
    );
    const now = this.scene.time.now;
    if (this.alt > 6 && this.sprite.visible && now - this.lastDust > 55) {
      this.lastDust = now;
      const [cx, cy] = this.cargo;
      this.dust.setDepth(this.gy);
      this.dust.emitParticleAt(cx - this.dir * 4, cy + 6 + Math.random() * 4, 1);
    }
  }

  /**
   * Fly to a ground point. `altitude(t)` shapes the flight (0..1 progress);
   * the default climbs, cruises at `cruise` and settles back onto the snow.
   */
  fly(
    to: Pt,
    opts: {
      cruise?: number;
      speed?: number;
      altitude?: (t: number) => number;
      land?: boolean;
    } = {},
  ): { tween: Phaser.Tweens.Tween; done: Promise<void> } {
    const from: Pt = [this.gx, this.gy];
    const startAlt = this.alt;
    const cruise = opts.cruise ?? 46;
    const land = opts.land ?? true;
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
    if (Math.abs(to[0] - from[0]) > 4) this.dir = to[0] > from[0] ? 1 : -1;
    const altitude =
      opts.altitude ??
      ((t: number) => {
        const up = Math.min(1, t / 0.2);
        const down = land ? Math.min(1, (1 - t) / 0.25) : 1;
        const base = startAlt + (cruise - startAlt) * Math.sin((up * Math.PI) / 2);
        return land ? base * Math.sin((down * Math.PI) / 2) : base;
      });
    this.pose(this.rider ? "fly-santa" : "fly-empty");
    const state = { t: 0 };
    let resolve!: () => void;
    const done = new Promise<void>((r) => (resolve = r));
    const tween = this.scene.tweens.add({
      targets: state,
      t: 1,
      duration: 700 + (dist / (opts.speed ?? 150)) * 1000,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        this.gx = from[0] + (to[0] - from[0]) * state.t;
        this.gy = from[1] + (to[1] - from[1]) * state.t;
        this.alt = Math.max(
          0,
          altitude(state.t) + Math.sin(state.t * 18) * 1.5 * (this.alt > 4 ? 1 : 0),
        );
        this.sync();
      },
      onComplete: () => {
        if (land) {
          this.park();
          if (this.sprite.visible) {
            this.puff.setDepth(this.gy + 2);
            this.puff.explode(10, this.gx, this.gy);
          }
        }
        resolve();
      },
      onStop: () => resolve(),
    });
    return { tween, done };
  }
}
