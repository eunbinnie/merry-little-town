// The explorable village. Santa walks where you tap (A* over a walkability
// grid), the camera follows, and gifts are physically loaded at the sleigh and
// placed at doors. React owns the overlay UI; this scene emits events to it.
import * as Phaser from "phaser";
import { BUILDING_META, SPRITE_SIZES, SANTA_META, SLEIGH_META } from "@/constants/sprites";
import { BUILDING_NAMES, BUILDING_NOTES, COPY, GIFTS } from "@/constants/copy";
import {
  CHIMNEY_HOUSE,
  HOUSE_IDS,
  SACK_SIZE,
  giftsLeftToLoad,
  isComplete,
  isDelivered,
  type GiftId,
  type HouseId,
  type VillageState,
} from "@/features/village/game";
import { dispatch, getVillage, subscribeVillage } from "@/features/village/store";
import {
  ASSET_ROOT,
  BRIDGE,
  BUILDINGS,
  BUILDING_IDS,
  GROUND_Y,
  LAMPS,
  MOON,
  PROP_KINDS,
  SKY_LAYERS,
  SKY_TOP,
  SLEIGH_PARK,
  SLEIGH_PICKUP,
  SPAWN,
  TREE,
  WORLD,
  POSTCARD,
  BULB_COLORS,
  LANTERN_FLAME,
  STRANDS,
  doorStand,
  isWater,
  obstacles,
  paintStrand,
  postcardFrame,
  sizesOf,
  worldProps,
  type BuildingId,
  type LampGroup,
  type Pt,
  type Rect,
  type Strand,
} from "./world";
import { Grid } from "./grid";
import { CameraZoom } from "./CameraZoom";
import { Santa, createSantaAnims } from "./Santa";
import { Sleigh, createSleighAnims } from "./Sleigh";
import { UI_FLAG, snapshotRegion } from "./capture";
import type { Destination, GameEvent } from "./types";
import { duckMusic, playSound, setBells } from "@/audio/sound";

type Img = Phaser.GameObjects.Image;
type Target = { kind: "building"; id: BuildingId } | { kind: "sleigh" } | { kind: "tree" };
type House = {
  lit: Img;
  decor: Img;
  glow: Img;
  marker: Img | null;
  gift: Img | null;
  /** Fully lit and settled: the windows may flicker like candlelight. */
  steady: boolean;
};
type Lamp = { lit: Img; glow: Img; pool: Img; group: LampGroup; step?: number; on: boolean };
type Lights = {
  s: Strand;
  bulbs: Img[];
  glows: Img[];
  phase: number[];
  speed: number[];
  box: Phaser.Geom.Rectangle;
  /** 0 → 1 as the bulbs come on one after another along the wire. */
  level: number;
  on: boolean;
};

const ADD = Phaser.BlendModes.ADD;
const tint = (hex: string) => parseInt(hex.slice(1), 16);

/** Nudges particles sideways with the scene's current wind. */
class Wind extends Phaser.GameObjects.Particles.ParticleProcessor {
  constructor(
    private readonly gust: () => number,
    private readonly depth: number,
  ) {
    super(0, 0, true);
  }
  update(p: Phaser.GameObjects.Particles.Particle, _delta: number, step: number): void {
    p.x += this.gust() * this.depth * step;
  }
}
const TREE_STAND: Pt = [TREE.x + 33, TREE.y + TREE.block[1] + TREE.block[3] + 8];
const NEIGHBOURS: BuildingId[] = ["chapel", "blue-cottage", "rose-cottage"];
const isHouse = (id: string): id is HouseId => (HOUSE_IDS as readonly string[]).includes(id);
const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

export class VillageScene extends Phaser.Scene {
  private grid!: Grid;
  private santa!: Santa;
  private sleigh!: Sleigh;
  private houses = new Map<BuildingId, House>();
  private lamps: Lamp[] = [];
  private tree!: { lit: Img; pile: Img; glow: Img; star: Img };
  private chill!: Phaser.GameObjects.Rectangle;
  private arrow!: Img;
  private ring!: Img;
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private snow: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private state!: VillageState;
  private busy = false;
  private intro = false;
  private introFlight: Phaser.Tweens.Tween | null = null;
  private keys = new Set<string>();
  private keyboardMoving = false;
  private lastInputKeyboard = false;
  private nearLabel: string | null = null;
  private wasMoving = false;
  private reduced = false;
  private cleanup: Array<() => void> = [];
  /** House whose card is being written; the scene stays paused meanwhile. */
  private cardHouse: HouseId | null = null;
  private finaleDone = false;
  private sleighReturn: Promise<void> = Promise.resolve();
  private bellsAt: Pt = [0, 0];
  private festoons: Lights[] = [];
  private flames: Img[] = [];
  private wind = 0;
  private zoom!: CameraZoom;
  /** The camera let go of Santa (zoomed toward another spot) until he walks or is recentred. */
  private free = false;
  private arrowGift!: Img;
  /** Where the edge pointer sits on screen, so a tap on it can send Santa there. */
  private arrowAt: { at: Pt; house: boolean } | null = null;
  /** The house the guidance points at: the nearest one still waiting. */
  private guide: HouseId | null = null;
  private guideAt = 0;

  constructor(private readonly emit: (e: GameEvent) => void) {
    super("village");
  }

  preload(): void {
    this.load.setPath(ASSET_ROOT);
    for (const rel of Object.keys(SPRITE_SIZES))
      if (!rel.startsWith("characters/")) this.load.image(rel, rel);
    this.load.spritesheet("characters/santa.png", "characters/santa.png", {
      frameWidth: SANTA_META.w,
      frameHeight: SANTA_META.h,
    });
    this.load.spritesheet("characters/sleigh.png", "characters/sleigh.png", {
      frameWidth: SLEIGH_META.w,
      frameHeight: SLEIGH_META.h,
    });
  }

  create(): void {
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.state = getVillage();
    this.finaleDone = isComplete(this.state);
    const sizes = sizesOf(BUILDING_META);
    const props = worldProps(sizes);
    this.grid = new Grid(obstacles(sizes, props));
    createSantaAnims(this);
    createSleighAnims(this);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD.w, WORLD.h).setBackgroundColor(SKY_TOP).setRoundPixels(true);
    this.zoom = new CameraZoom(this, {
      canZoom: () => this.state.started && !this.busy && !this.intro,
      tracking: () => this.santa.moving || this.keyboardMoving,
      release: () => {
        this.cameras.main.stopFollow();
        this.free = true;
      },
    });
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.zoom.fit());

    this.buildSky();
    this.add.image(0, GROUND_Y, "world/ground.png").setOrigin(0).setDepth(-500);
    this.add.image(BRIDGE.x, BRIDGE.y, "world/bridge-deck.png").setOrigin(0).setDepth(-490);
    this.add
      .image(BRIDGE.x, BRIDGE.y, "world/bridge-back.png")
      .setOrigin(0)
      .setDepth(BRIDGE.y + 9);
    this.add
      .image(BRIDGE.x, BRIDGE.y, "world/bridge-front.png")
      .setOrigin(0)
      .setDepth(BRIDGE.y + 31);
    this.buildBuildings();
    this.buildTree();
    for (const p of props) {
      const k = PROP_KINDS[p.kind];
      this.add
        .image(p.x, p.y, k.src)
        .setOrigin(0)
        .setDepth(p.y + k.h)
        .setFlipX(Boolean(p.flip));
      if (p.kind === "lantern-post")
        this.flames.push(
          this.add
            .image(p.x + LANTERN_FLAME[0], p.y + LANTERN_FLAME[1], "effects/glow-warm.png")
            .setBlendMode(ADD)
            .setDepth(9000)
            .setScale(0.5)
            .setAlpha(0.45),
        );
    }
    this.buildLamps();
    this.buildStrands();
    this.buildEffects();

    this.sleigh = new Sleigh(this, SLEIGH_PARK);
    const pos = this.state.pos;
    const start: Pt = pos && this.grid.walkable(pos[0], pos[1]) ? pos : SPAWN;
    this.santa = new Santa(this, this.grid, start);
    this.santa.setFull(this.state.sack.length > 0);
    this.santa.onStep = (ground) =>
      playSound(ground === "wood" ? "stepWood" : "step", {
        rate: Phaser.Math.FloatBetween(0.9, 1.1) * (ground === "stone" ? 1.12 : 1),
        gain: (ground === "stone" ? 0.7 : 1) * Phaser.Math.FloatBetween(0.8, 1),
      });

    this.ring = this.ui(this.add.image(0, 0, "effects/tap.png").setDepth(-450).setVisible(false));
    this.arrow = this.ui(
      this.add
        .image(0, 0, "effects/marker.png")
        .setDepth(9900)
        .setScrollFactor(0)
        .setVisible(false),
    );
    this.arrowGift = this.ui(
      this.add
        .image(0, 0, "gifts/box-crimson.png")
        .setDepth(9900)
        .setScrollFactor(0)
        .setVisible(false),
    );
    this.chill = this.add
      .rectangle(0, 0, 8000, 8000, 0x0a101d)
      .setScrollFactor(0)
      .setDepth(8000)
      .setAlpha(this.chillFor(this.state));

    this.applyState();
    if (this.state.started) cam.startFollow(this.santa.sprite, true, 0.14, 0.14);
    else {
      this.santa.setVisible(false);
      this.sleigh.sprite.setVisible(false);
      cam.centerOn(560, 230);
    }

    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointer, this);
    const down = (e: KeyboardEvent) => this.onKey(e, true);
    const up = (e: KeyboardEvent) => this.onKey(e, false);
    const blur = () => this.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    const unsubscribe = subscribeVillage(() => this.onStore());
    this.cleanup.push(
      () => window.removeEventListener("keydown", down),
      () => window.removeEventListener("keyup", up),
      () => window.removeEventListener("blur", blur),
      unsubscribe,
    );
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup.forEach((f) => f()));
    this.emit({ type: "ready" });
  }

  // ---------------------------------------------------------------- building the world

  private ui<T extends Phaser.GameObjects.GameObject>(o: T): T {
    o.setData(UI_FLAG, true);
    return o;
  }

  private buildSky(): void {
    const order = ["sky", "stars", "mountains", "forest"] as const;
    order.forEach((name, i) => {
      const l = SKY_LAYERS[name];
      this.add
        .tileSprite(0, l.y, WORLD.w, l.h, l.src)
        .setOrigin(0)
        .setDepth(-1000 + i * 2);
    });
    this.add.image(MOON[0], MOON[1], "backgrounds/moon.png").setOrigin(0).setDepth(-997);
    const rnd = new Phaser.Math.RandomDataGenerator(["stars"]);
    for (let i = 0; i < 18; i++) {
      const star = this.add
        .image(rnd.between(4, WORLD.w - 4), rnd.between(6, 96), "effects/twinkle.png")
        .setDepth(-997.5)
        .setAlpha(0);
      if (this.reduced) star.setAlpha(0.6);
      else
        this.tweens.add({
          targets: star,
          alpha: 1,
          duration: rnd.between(700, 1400),
          yoyo: true,
          repeat: -1,
          delay: rnd.between(0, 4000),
          repeatDelay: rnd.between(1500, 5000),
        });
    }
    if (!this.reduced)
      this.time.addEvent({ delay: 9000, loop: true, callback: () => this.shootingStar() });
  }

  private shootingStar(): void {
    const x = Phaser.Math.Between(80, WORLD.w - 200);
    const y = Phaser.Math.Between(10, 60);
    const head = this.add.image(x, y, "effects/flake.png").setDepth(-997.6);
    const trail = this.add.particles(0, 0, "effects/dot.png", {
      follow: head,
      frequency: 16,
      lifespan: 380,
      alpha: { start: 0.8, end: 0 },
    });
    trail.setDepth(-997.6);
    this.tweens.add({
      targets: head,
      x: x + 90,
      y: y + 30,
      alpha: 0,
      duration: 900,
      ease: "Quad.easeIn",
      onComplete: () => {
        head.destroy();
        this.time.delayedCall(400, () => trail.destroy());
      },
    });
  }

  private buildBuildings(): void {
    for (const id of BUILDING_IDS) {
      const b = BUILDINGS[id];
      const m = BUILDING_META[id];
      const z = b.y + b.block[1] + b.block[3];
      this.add.image(b.x, b.y, `buildings/${id}-base.png`).setOrigin(0).setDepth(z);
      const lit = this.add
        .image(b.x, b.y, `buildings/${id}-lit.png`)
        .setOrigin(0)
        .setDepth(z + 0.01);
      const decor = this.add
        .image(b.x, b.y, `buildings/${id}-decor.png`)
        .setOrigin(0)
        .setDepth(z + 0.02);
      const glow = this.add
        .image(b.x + m.w / 2, b.y + m.h * 0.66, "effects/glow-warm-large.png")
        .setBlendMode(ADD)
        .setDepth(9000)
        .setScale(m.w / 96, m.h / 120);
      lit.setAlpha(0);
      decor.setAlpha(0);
      glow.setAlpha(0);
      if (m.smoke)
        this.add
          .particles(b.x + m.smoke[0], b.y + m.smoke[1], "effects/smoke.png", {
            frequency: this.reduced ? 2400 : 950,
            lifespan: 3800,
            speedY: { min: -9, max: -5 },
            speedX: { min: 1, max: 4 },
            scale: { start: 0.45, end: 1.3 },
            alpha: { start: 0.6, end: 0 },
          })
          .setDepth(z + 0.05);
      let marker: Img | null = null;
      if (isHouse(id)) {
        marker = this.ui(
          this.add
            .image(b.x + m.door[0], b.y + m.top - 10, "effects/marker.png")
            .setDepth(9800)
            .setVisible(false),
        );
        this.tweens.add({
          targets: marker,
          y: marker.y - 3,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
      this.houses.set(id, { lit, decor, glow, marker, gift: null, steady: false });
    }
  }

  private buildTree(): void {
    const z = TREE.y + TREE.block[1] + TREE.block[3];
    this.add.image(TREE.x, TREE.y, "trees/christmas-tree.png").setOrigin(0).setDepth(z);
    this.tree = {
      lit: this.add
        .image(TREE.x, TREE.y, "trees/christmas-tree-lit.png")
        .setOrigin(0)
        .setDepth(z + 0.01)
        .setAlpha(0),
      pile: this.add
        .image(TREE.x + 16, TREE.y + 88, "trees/gift-pile.png")
        .setOrigin(0)
        .setDepth(z + 0.02)
        .setAlpha(0),
      glow: this.add
        .image(TREE.x + 33, TREE.y + 56, "effects/glow-warm-large.png")
        .setBlendMode(ADD)
        .setDepth(9000)
        .setScale(1.5, 1.7)
        .setAlpha(0),
      star: this.add
        .image(TREE.x + 33, TREE.y + 9, "effects/glow-warm.png")
        .setBlendMode(ADD)
        .setDepth(9001)
        .setScale(0.7)
        .setAlpha(0),
    };
  }

  private buildLamps(): void {
    for (const l of LAMPS) {
      const z = l.y + 30;
      this.add.image(l.x, l.y, "decorations/lamppost.png").setOrigin(0).setDepth(z);
      this.lamps.push({
        lit: this.add
          .image(l.x, l.y, "decorations/lamppost-lit.png")
          .setOrigin(0)
          .setDepth(z + 0.01)
          .setAlpha(0),
        glow: this.add
          .image(l.x + 4.5, l.y + 6, "effects/glow-warm.png")
          .setBlendMode(ADD)
          .setDepth(9000)
          .setAlpha(0),
        pool: this.add
          .image(l.x + 4.5, l.y + 31, "effects/glow-warm.png")
          .setBlendMode(ADD)
          .setDepth(-400)
          .setScale(1.3, 0.55)
          .setAlpha(0),
        group: l.group,
        step: l.step,
        on: false,
      });
    }
  }

  /** String lights and bunting: a pixel wire texture, plus a lit bulb and glow per bead. */
  private buildStrands(): void {
    STRANDS.forEach((s, i) => {
      const px: Array<[number, number, string]> = [];
      const beads = paintStrand(s, (x, y, c) => px.push([x, y, c]));
      const xs = px.map((p) => p[0]);
      const ys = px.map((p) => p[1]);
      const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
      const key = `strand-${i}`;
      if (!this.textures.exists(key)) {
        const tex = this.textures.createCanvas(
          key,
          Math.max(...xs) - x0 + 1,
          Math.max(...ys) - y0 + 1,
        );
        const ctx = tex!.getContext();
        for (const [x, y, c] of px) {
          ctx.fillStyle = c;
          ctx.fillRect(x - x0, y - y0, 1, 1);
        }
        tex!.refresh();
      }
      const wire = this.add.image(x0, y0, key).setOrigin(0).setDepth(s.z);
      if (s.kind !== "lights") return;
      const color = (j: number) => tint(BULB_COLORS[j % BULB_COLORS.length]!);
      this.festoons.push({
        s,
        bulbs: beads.map(([x, y], j) =>
          this.add
            .image(x + 0.5, y + 0.5, "effects/dot.png")
            .setTint(color(j))
            .setDepth(s.z + 0.01)
            .setAlpha(0),
        ),
        glows: beads.map(([x, y], j) =>
          this.add
            .image(x + 0.5, y + 0.5, "effects/glow-warm.png")
            .setTint(color(j))
            .setBlendMode(ADD)
            .setDepth(9000)
            .setScale(0.16)
            .setAlpha(0),
        ),
        phase: beads.map(() => Math.random() * Math.PI * 2),
        speed: beads.map(() => 0.7 + Math.random() * 1.1),
        box: wire.getBounds(),
        level: 0,
        on: false,
      });
    });
  }

  private buildEffects(): void {
    const cam = this.cameras.main;
    const rx = () => cam.worldView.x - 8 + Math.random() * (cam.worldView.width + 16);
    const ry = () => cam.worldView.y - 8 + Math.random() * (cam.worldView.height + 16);
    const fade = (t: number) => Math.sin(t * Math.PI);
    const slow = this.reduced ? 0.25 : 1;
    // three depths: fine far flakes, the usual ones, and now and then a big
    // soft flake drifting close past the camera. The first two sit under the
    // lamp glows, so snow falling through lamplight turns warm.
    for (const [tex, freq, speed, depth, drift, life] of [
      ["effects/dot.png", 36, 9, 8990, 0.6, 8500],
      ["effects/flake.png", 140, 16, 8991, 1, 8000],
      ["effects/flake-large.png", 1500, 30, 9502, 1.7, 4000],
    ] as const) {
      const near = depth > 9000;
      const e = this.add
        .particles(0, 0, tex, {
          x: { onEmit: rx },
          y: { onEmit: ry },
          lifespan: { min: life * 0.55, max: life },
          speedY: { min: speed * 0.6 * slow, max: speed * slow },
          speedX: { min: -3 * slow, max: 4 * slow },
          alpha: { start: 0, end: near ? 0.8 : 0.95, ease: fade },
          frequency: this.reduced ? freq * 3 : freq,
        })
        .setDepth(depth);
      e.addParticleProcessor(new Wind(() => this.wind, drift * slow));
      // the big near flakes belong to the moment, not to the postcard
      if (near) this.ui(e);
      this.snow.push(e);
    }
    if (!this.reduced)
      this.time.addEvent({ delay: 1300, loop: true, callback: () => this.glint() });
    this.sparkles = this.add
      .particles(0, 0, "effects/sparkle.png", {
        emitting: false,
        speed: { min: 18, max: 56 },
        lifespan: { min: 600, max: 1100 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0.2 },
        gravityY: 26,
      })
      .setDepth(9600);
  }

  // ---------------------------------------------------------------- state → visuals

  private chillFor(s: VillageState): number {
    // the night stays; it just gets less cold as windows light up
    return isComplete(s) ? 0.2 : 0.38 - 0.02 * s.deliveries.length;
  }

  private applyState(): void {
    const s = this.state;
    const done = isComplete(s);
    for (const d of s.deliveries) {
      this.lightHouse(d.houseId, true);
      this.placeGift(d.houseId, d.wrapId, true);
    }
    this.lightHouse("workshop", true);
    if (done) {
      NEIGHBOURS.forEach((id) => this.lightHouse(id, true));
      this.lightTree(true);
    }
    this.refreshLamps(true);
  }

  private lampWanted(l: { group: LampGroup; step?: number }): boolean {
    const s = this.state;
    if (l.group === "always") return true;
    if (l.group === "plaza") return isComplete(s) || s.deliveries.length >= (l.step ?? 99);
    return isHouse(l.group) ? isDelivered(s, l.group) : isComplete(s);
  }

  private refreshLamps(instant: boolean): void {
    this.lamps.forEach((l, i) => {
      const on = this.lampWanted(l);
      if (on === l.on) return;
      l.on = on;
      const targets = [l.lit, l.glow, l.pool];
      this.tweens.killTweensOf(targets);
      const alpha = (o: Img) => (!on ? 0 : o === l.lit ? 1 : o === l.pool ? 0.32 : 0.5);
      if (instant) targets.forEach((o) => o.setAlpha(alpha(o)));
      else
        targets.forEach((o) =>
          this.tweens.add({ targets: o, alpha: alpha(o), duration: 500, delay: 250 + i * 40 }),
        );
      if (on && !this.reduced)
        this.tweens.add({
          targets: l.glow,
          alpha: 0.38,
          duration: 1400 + i * 37,
          yoyo: true,
          repeat: -1,
          delay: instant ? i * 90 : 1000,
        });
    });
    // string lights come on with their lamps, bulb after bulb along the wire
    for (const l of this.festoons) {
      const on = this.lampWanted(l.s);
      if (on === l.on) continue;
      l.on = on;
      this.tweens.killTweensOf(l);
      if (instant || this.reduced) l.level = on ? 1 : 0;
      else
        this.tweens.add({
          targets: l,
          level: on ? 1 : 0,
          duration: on ? 1600 : 300,
          delay: on ? 700 : 0,
        });
    }
    const chill = this.chillFor(this.state);
    if (instant) this.chill.setAlpha(chill);
    else this.tweens.add({ targets: this.chill, alpha: chill, duration: 1500 });
  }

  private lightHouse(id: BuildingId, instant: boolean, chime = true): Promise<void> {
    const h = this.houses.get(id)!;
    this.tweens.killTweensOf([h.lit, h.decor, h.glow]);
    h.steady = instant;
    const flicker = () =>
      !this.reduced &&
      this.tweens.add({
        targets: h.glow,
        alpha: 0.32,
        duration: 1700 + Math.random() * 900,
        yoyo: true,
        repeat: -1,
      });
    if (instant) {
      h.lit.setAlpha(1);
      h.decor.setAlpha(1);
      h.glow.setAlpha(0.42);
      flicker();
      return Promise.resolve();
    }
    const b = BUILDINGS[id];
    const m = BUILDING_META[id];
    this.tweens.add({
      targets: h.lit,
      alpha: 1,
      duration: 700,
      onComplete: () => void (h.steady = true),
    });
    this.tweens.add({ targets: h.decor, alpha: 1, duration: 900, delay: 350 });
    h.glow.setAlpha(0);
    this.tweens.add({
      targets: h.glow,
      alpha: { from: 0.95, to: 0.42 },
      duration: 1400,
      ease: "Quad.easeOut",
      onComplete: flicker,
    });
    if (!this.reduced) this.sparkles.explode(16, b.x + m.w / 2, b.y + m.h * 0.55);
    // the chime climbs a little as more of the village lights up
    const n = getVillage().deliveries.length;
    if (chime) playSound("light", { variant: n <= 2 ? 0 : n <= 4 ? 1 : 2 });
    return this.wait(900);
  }

  private lightTree(instant: boolean): void {
    const { lit, pile, glow, star } = this.tree;
    if (instant) {
      lit.setAlpha(1);
      pile.setAlpha(1);
      glow.setAlpha(0.5);
      star.setAlpha(0.9);
    } else {
      this.tweens.add({ targets: lit, alpha: 1, duration: 1400 });
      this.tweens.add({ targets: pile, alpha: 1, duration: 600, delay: 900 });
      this.tweens.add({ targets: glow, alpha: 0.5, duration: 1800 });
      this.tweens.add({ targets: star, alpha: 0.9, duration: 800, delay: 1100 });
      this.sparkles.explode(30, TREE.x + 33, TREE.y + 50);
    }
    if (!this.reduced) {
      this.tweens.add({
        targets: star,
        scale: 0.95,
        duration: 900,
        yoyo: true,
        repeat: -1,
        delay: 1900,
      });
      this.tweens.add({
        targets: lit,
        alpha: 0.82,
        duration: 650,
        yoyo: true,
        repeat: -1,
        delay: 1900,
      });
    }
  }

  private placeGift(id: HouseId, wrap: string, instant: boolean): Img {
    const b = BUILDINGS[id];
    const m = BUILDING_META[id];
    const z = b.y + b.block[1] + b.block[3];
    if (id === CHIMNEY_HOUSE && m.smoke) {
      // on its way down the chimney: only the lid and bow still show
      const [cx, cy] = [b.x + m.smoke[0], b.y + m.smoke[1] + 6];
      const img = this.add
        .image(cx, instant ? cy : cy - 5, `gifts/box-${wrap}.png`)
        .setOrigin(0.5, 1)
        .setCrop(0, 0, 11, 6)
        .setDepth(z + 0.06);
      if (!instant) this.tweens.add({ targets: img, y: cy, duration: 420, ease: "Quad.easeIn" });
      this.houses.get(id)!.gift = img;
      return img;
    }
    const [gx, gy] = [b.x + m.gift[0], b.y + m.gift[1]];
    const img = this.add
      .image(gx, instant ? gy : gy - 6, `gifts/box-${wrap}.png`)
      .setOrigin(0.5, 1)
      .setDepth(Math.max(gy, z + 0.5));
    if (!instant) this.tweens.add({ targets: img, y: gy, duration: 260, ease: "Bounce.easeOut" });
    this.houses.get(id)!.gift = img;
    return img;
  }

  // ---------------------------------------------------------------- input

  private onPointer(p: Phaser.Input.Pointer): void {
    this.lastInputKeyboard = false;
    if (this.zoom.swallowTap(p)) return; // the end of a pinch or a drag is not a tap
    if (!this.state.started || this.busy || this.intro) return;
    // tapping the edge pointer walks Santa to what it points at
    const arrow = this.arrowAt;
    if (arrow && Math.hypot(p.x - arrow.at[0], p.y - arrow.at[1]) < 30)
      return arrow.house ? this.goToNearest() : this.goToTarget({ kind: "sleigh" });
    const target = this.targetAt(p.worldX, p.worldY);
    if (target) return this.goToTarget(target);
    const goal = this.grid.nearest(p.worldX, p.worldY);
    if (!goal) return;
    this.walk(goal);
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const el = e.target as HTMLElement | null;
    if (el?.closest?.("button, a, input, textarea, select, dialog")) return;
    if (KEYS[e.code]) {
      e.preventDefault();
      if (down) this.keys.add(e.code);
      else this.keys.delete(e.code);
      this.lastInputKeyboard = true;
      return;
    }
    if (down && (e.code === "Space" || e.code === "Enter")) {
      e.preventDefault();
      this.lastInputKeyboard = true;
      const t = this.nearestTarget();
      if (t && !this.busy && !this.intro && this.state.started) this.interact(t);
    }
  }

  /** Public: the accessible "go to" list in the UI. */
  goTo(dest: Destination): void {
    if (!this.state.started || this.busy || this.intro) return;
    this.goToTarget(
      dest === "sleigh"
        ? { kind: "sleigh" }
        : dest === "tree"
          ? { kind: "tree" }
          : { kind: "building", id: dest },
    );
  }

  private standOf(t: Target): Pt {
    if (t.kind === "sleigh") return SLEIGH_PICKUP;
    if (t.kind === "tree") return TREE_STAND;
    return doorStand(t.id, BUILDING_META[t.id]);
  }

  private targetAt(x: number, y: number): Target | null {
    const s = this.sleigh.sprite;
    if (s.visible && this.sleigh.alt === 0 && s.getBounds().contains(x, y))
      return { kind: "sleigh" };
    const ordered = [...BUILDING_IDS].sort(
      (a, b) => BUILDINGS[b].y + BUILDINGS[b].block[1] - (BUILDINGS[a].y + BUILDINGS[a].block[1]),
    );
    const alphaAt = (key: string, px: number, py: number) =>
      this.textures.getPixelAlpha(Math.floor(px), Math.floor(py), key) ?? 0;
    if (
      x >= TREE.x &&
      y >= TREE.y &&
      x < TREE.x + TREE.w &&
      y < TREE.y + TREE.h &&
      alphaAt("trees/christmas-tree.png", x - TREE.x, y - TREE.y) > 160
    )
      return { kind: "tree" };
    for (const id of ordered) {
      const b = BUILDINGS[id];
      const m = BUILDING_META[id];
      if (x < b.x || y < b.y || x >= b.x + m.w || y >= b.y + m.h) continue;
      if (alphaAt(`buildings/${id}-base.png`, x - b.x, y - b.y) > 160)
        return { kind: "building", id };
    }
    return null;
  }

  private nearestTarget(): Target | null {
    const all: Target[] = [
      { kind: "sleigh" },
      { kind: "tree" },
      ...BUILDING_IDS.map((id) => ({ kind: "building", id }) as Target),
    ];
    let best: Target | null = null;
    let bestD = 22;
    for (const t of all) {
      const [x, y] = this.standOf(t);
      const d = Math.hypot(x - this.santa.x, y - this.santa.y);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  private walk(goal: Pt, then?: () => void, byPlayer = true): boolean {
    const path = this.grid.path([this.santa.x, this.santa.y], goal);
    if (!path) {
      this.toast(COPY.toast.unreachable);
      return false;
    }
    if (!byPlayer) {
      this.santa.follow(path, then);
      return true;
    }
    const end = path[path.length - 1]!;
    this.ring
      .setPosition(Math.round(end[0]), Math.round(end[1]))
      .setVisible(true)
      .setAlpha(1)
      .setScale(0.6);
    this.tweens.killTweensOf(this.ring);
    this.tweens.add({
      targets: this.ring,
      scale: 1.2,
      alpha: 0,
      duration: 650,
      ease: "Quad.easeOut",
    });
    this.santa.follow(path, then);
    if (this.free) this.follow(this.santa.sprite); // walking brings the camera back to Santa
    this.emit({ type: "moved" });
    return true;
  }

  private goToTarget(t: Target): void {
    this.walk(this.standOf(t), () => this.interact(t));
  }

  // ---------------------------------------------------------------- camera & guidance (public)

  zoomBy(dir: 1 | -1): void {
    this.zoom.zoomBy(dir);
  }

  /** Back to Santa: the camera glides over and follows him again. */
  recenter(): void {
    if (this.state.started && !this.busy && !this.intro) this.follow(this.santa.sprite);
  }

  santaAt(): Pt {
    return [this.santa.x, this.santa.y];
  }

  /** Walk to the closest house still waiting for a gift (by walking distance). */
  goToNearest(): void {
    if (!this.state.started || this.busy || this.intro) return;
    const best = this.nearestHouse();
    if (!best) return this.toast(COPY.toast.unreachable);
    this.guide = best;
    this.goToTarget({ kind: "building", id: best });
  }

  private nearestHouse(): HouseId | null {
    let best: HouseId | null = null;
    let bestLen = Infinity;
    for (const id of HOUSE_IDS) {
      if (isDelivered(this.state, id)) continue;
      const path = this.grid.path([this.santa.x, this.santa.y], doorStand(id, BUILDING_META[id]));
      if (!path) continue;
      let len = 0;
      let prev: Pt = [this.santa.x, this.santa.y];
      for (const q of path) {
        len += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
        prev = q;
      }
      if (len < bestLen) [best, bestLen] = [id, len];
    }
    return best;
  }

  private interact(t: Target): void {
    const s = getVillage();
    if (t.kind === "sleigh") return void this.pickup();
    if (t.kind === "tree") {
      this.santa.face("n");
      this.toast(COPY.toast.tree, isComplete(s) ? COPY.toast.treeLit : COPY.toast.treeWaiting);
      return;
    }
    const id = t.id;
    if (!isHouse(id)) {
      this.santa.face("n");
      this.toast(BUILDING_NAMES[id], BUILDING_NOTES[id]);
      return;
    }
    if (isDelivered(s, id)) return void this.openCard(id, false);
    if (!s.sack.length) return this.toast(COPY.toast.noGift, COPY.toast.noGiftBody);
    void (id === CHIMNEY_HOUSE ? this.chimneyDelivery(id) : this.doorDelivery(id));
  }

  // ---------------------------------------------------------------- sequences

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) =>
      this.tweens.add({ ...cfg, onComplete: () => resolve(), onStop: () => resolve() }),
    );
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.emit({ type: "busy", busy });
  }

  private toast(title: string, body?: string, items?: GiftId[]): void {
    this.emit({ type: "toast", title, body, items });
  }

  private follow(target: Phaser.GameObjects.Sprite, lerp = 0.14): void {
    this.free = false;
    this.cameras.main.startFollow(target, true, lerp, lerp);
  }

  playIntro(): void {
    if (this.intro) return;
    this.intro = true;
    this.emit({ type: "intro", playing: true });
    this.setBusy(true);
    this.santa.setVisible(false);
    const sl = this.sleigh;
    sl.sprite.setVisible(true);
    sl.rider = true;
    sl.gx = -90;
    sl.gy = 262;
    sl.alt = 150;
    sl.dir = 1;
    sl.sync();
    this.follow(sl.sprite, 0.07);
    if (this.reduced) return this.finishIntro();
    const flight = sl.fly(SLEIGH_PARK, {
      speed: 120,
      altitude: (t) => 150 * (1 - t) ** 1.5 + Math.sin(t * Math.PI) * 14,
    });
    this.introFlight = flight.tween;
    void flight.done.then(async () => {
      if (!this.intro) return;
      this.puffAt(SLEIGH_PARK[0], SLEIGH_PARK[1], 18);
      playSound("place", { rate: 0.6, gain: 0.5 });
      await this.wait(500);
      this.finishIntro();
    });
  }

  skipIntro(): void {
    this.finishIntro();
  }

  private finishIntro(): void {
    if (!this.intro) return;
    this.intro = false;
    this.introFlight?.stop();
    this.introFlight = null;
    const sl = this.sleigh;
    [sl.gx, sl.gy] = SLEIGH_PARK;
    sl.dir = 1;
    sl.rider = false;
    sl.park();
    this.santa.place([SPAWN[0], SPAWN[1]]);
    this.santa.setVisible(true);
    this.santa.face("s");
    if (!this.reduced) {
      this.santa.sprite.y -= 8;
      this.tweens.add({
        targets: this.santa.sprite,
        y: SPAWN[1],
        duration: 380,
        ease: "Bounce.easeOut",
      });
      this.puffAt(SPAWN[0], SPAWN[1], 6);
    }
    this.follow(this.santa.sprite);
    this.setBusy(false);
    this.emit({ type: "intro", playing: false });
  }

  private puffAt(x: number, y: number, n: number): void {
    const p = this.add
      .particles(0, 0, "effects/flake.png", {
        emitting: false,
        speed: { min: 10, max: 34 },
        angle: { min: 190, max: 350 },
        lifespan: 600,
        gravityY: 40,
        alpha: { start: 1, end: 0 },
      })
      .setDepth(y + 1);
    p.explode(n, x, y);
    this.time.delayedCall(800, () => p.destroy());
  }

  private async pickup(): Promise<void> {
    const s = getVillage();
    if (isComplete(s)) return this.toast(COPY.toast.complete);
    if (s.sack.length >= SACK_SIZE) return this.toast(COPY.toast.sackFull, COPY.toast.sackFullBody);
    if (giftsLeftToLoad(s) === 0) return this.toast(COPY.toast.allLoaded);
    this.setBusy(true);
    const santa = this.santa;
    santa.face("e");
    santa.pose(2);
    const before = s.sack.length;
    dispatch({ type: "load", random: Array.from({ length: SACK_SIZE * 2 }, Math.random) });
    const added = getVillage().sack.slice(before);
    const [cx, cy] = this.sleigh.cargo;
    const n = added.length;
    const spots = added.map((_, i): Pt => [santa.x + (i - (n - 1) / 2) * 22, santa.y - 46]);
    const boxes = added.map((g) =>
      this.add.image(cx, cy, `gifts/box-${g.wrapId}.png`).setDepth(9700),
    );
    await Promise.all(
      boxes.map((box, i) =>
        this.tween({
          targets: box,
          x: spots[i]![0],
          y: spots[i]![1],
          duration: 520,
          delay: i * 150,
          ease: "Back.easeOut",
        }),
      ),
    );
    playSound("rustle");
    await this.tween({
      targets: boxes,
      angle: { from: -12, to: 12 },
      duration: 90,
      yoyo: true,
      repeat: 2,
    });
    playSound("twinkle");
    const shown = added.map((g, i) => {
      const [x, y] = spots[i]!;
      boxes[i]!.destroy();
      this.sparkles.explode(8, x, y);
      const glow = this.add
        .image(x, y, "effects/glow-warm.png")
        .setBlendMode(ADD)
        .setDepth(9690)
        .setAlpha(0.7);
      const item = this.add.image(x, y, `gifts/item-${g.giftId}.png`).setDepth(9700).setScale(0.3);
      this.tweens.add({ targets: item, scale: 1, duration: 380, ease: "Back.easeOut" });
      this.tweens.add({
        targets: item,
        y: y - 3,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      return [item, glow] as const;
    });
    santa.idle();
    santa.setFull(true);
    santa.face("s");
    this.toast(
      COPY.toast.loaded,
      added.map((g) => GIFTS[g.giftId].name).join(" · "),
      added.map((g) => g.giftId),
    );
    await this.wait(1400);
    await Promise.all(
      shown.map(([item, glow], i) => {
        this.tweens.killTweensOf(item);
        return this.tween({
          targets: [item, glow],
          x: santa.x - 7,
          y: santa.y - 16,
          scale: 0.15,
          alpha: 0,
          duration: 360,
          delay: i * 110,
          ease: "Cubic.easeIn",
        });
      }),
    );
    shown.forEach(([item, glow]) => {
      item.destroy();
      glow.destroy();
    });
    this.setBusy(false);
  }

  private async doorDelivery(id: HouseId): Promise<void> {
    this.setBusy(true);
    const santa = this.santa;
    const b = BUILDINGS[id];
    const m = BUILDING_META[id];
    const gift = getVillage().sack[0]!;
    santa.face(b.x + m.gift[0] >= santa.x ? "e" : "w");
    santa.pose(0);
    await this.wait(340);
    santa.pose(1);
    this.placeGift(id, gift.wrapId, false);
    playSound("place", { at: 0.09 }); // when the bounce first touches the snow
    this.puffAt(b.x + m.gift[0], b.y + m.gift[1], 5);
    await this.wait(300);
    santa.pose(2);
    await this.wait(240);
    dispatch({ type: "deliver", houseId: id });
    santa.setFull(getVillage().sack.length > 0);
    santa.idle();
    await this.lightHouse(id, false);
    this.refreshLamps(false);
    await this.openCard(id, true);
  }

  /** The door is snowed in: Rudolph flies Santa to the roof and the gift goes down the chimney. */
  private async chimneyDelivery(id: HouseId): Promise<void> {
    this.setBusy(true);
    const santa = this.santa;
    const sl = this.sleigh;
    const b = BUILDINGS[id];
    const m = BUILDING_META[id];
    const gift = getVillage().sack[0]!;
    const stand: Pt = [santa.x, santa.y];
    this.toast(COPY.toast.chimney, COPY.toast.chimneyBody);
    santa.cheer();
    await this.wait(this.reduced ? 300 : 900);
    // Rudolph lands beside Santa
    const land: Pt = [stand[0] + 48, stand[1] + 4];
    sl.rider = false;
    await sl.fly(land, { cruise: 56, speed: 190 }).done;
    santa.setVisible(false);
    sl.rider = true;
    sl.dir = -1;
    sl.park();
    this.puffAt(land[0], land[1], 8);
    await this.wait(350);
    // up to the chimney: the cargo hovers right above it
    const chimney: Pt = [b.x + (m.smoke?.[0] ?? m.w / 2), b.y + (m.smoke?.[1] ?? 0)];
    const ground = stand[1] + 4;
    const hover = ground - 12 - (chimney[1] - 10);
    this.follow(sl.sprite, 0.1);
    await sl.fly([chimney[0] - 30, ground], {
      land: false,
      speed: 60,
      altitude: (t) => (hover * (1 - Math.cos(t * Math.PI))) / 2,
    }).done;
    sl.dir = -1;
    sl.sync();
    const [cx, cy] = sl.cargo;
    const box = this.add.image(cx, cy, `gifts/box-${gift.wrapId}.png`).setDepth(9700);
    await this.tween({
      targets: box,
      x: chimney[0],
      y: chimney[1] - 2,
      duration: 380,
      ease: "Quad.easeIn",
    });
    box.destroy();
    this.placeGift(id, gift.wrapId, false);
    playSound("place", { rate: 0.7, gain: 0.8, at: 0.4 }); // settling down the chimney
    this.sparkles.explode(18, chimney[0], chimney[1]);
    const warm = this.add
      .image(chimney[0], chimney[1], "effects/glow-warm.png")
      .setBlendMode(ADD)
      .setDepth(9650)
      .setScale(0.4);
    void this.tween({
      targets: warm,
      scale: 1.4,
      alpha: 0,
      duration: 1200,
      ease: "Quad.easeOut",
    }).then(() => warm.destroy());
    dispatch({ type: "deliver", houseId: id });
    await this.lightHouse(id, false);
    this.refreshLamps(false);
    await this.wait(400);
    // back down, Santa hops out, Rudolph goes home
    await sl.fly(land, {
      speed: 60,
      altitude: (t) => (hover * (1 + Math.cos(t * Math.PI))) / 2,
    }).done;
    sl.rider = false;
    sl.park();
    santa.place(stand);
    santa.setVisible(true);
    santa.setFull(getVillage().sack.length > 0);
    santa.face("e");
    this.sleighReturn = sl.fly(SLEIGH_PARK, { cruise: 60, speed: 200 }).done.then(() => {
      sl.dir = 1;
      sl.park();
    });
    await this.openCard(id, true);
  }

  private pan(x: number, y: number, ms: number): Promise<void> {
    const cam = this.cameras.main;
    cam.stopFollow();
    if (this.reduced) {
      cam.centerOn(x, y);
      return Promise.resolve();
    }
    return new Promise((resolve) =>
      cam.pan(x, y, ms, "Sine.easeInOut", true, (_c: unknown, p: number) => p === 1 && resolve()),
    );
  }

  private async finale(): Promise<void> {
    const sl = this.sleigh;
    await this.sleighReturn;
    await this.pan(TREE.x + 33, TREE.y + 64, 1400);
    this.lightTree(false);
    duckMusic("finale", 0.15);
    playSound("finale");
    this.time.delayedCall(10500, () => duckMusic("finale", null));
    NEIGHBOURS.forEach((id) => void this.lightHouse(id, false, false));
    this.refreshLamps(false);
    for (const s of this.snow) s.frequency = s.frequency / 2;
    if (!this.reduced) {
      // a victory lap around the tree
      const c: Pt = [TREE.x + 33, TREE.y + 100];
      await sl.fly([c[0] + 110, c[1]], { land: false, cruise: 70, speed: 220 }).done;
      const lap = { a: 0 };
      await this.tween({
        targets: lap,
        a: Math.PI * 2,
        duration: 3600,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          const px = sl.gx;
          sl.gx = c[0] + Math.cos(lap.a) * 110;
          sl.gy = c[1] + Math.sin(lap.a) * 46;
          sl.alt = 70 + Math.sin(lap.a * 2) * 8;
          if (Math.abs(sl.gx - px) > 0.05) sl.dir = sl.gx > px ? 1 : -1;
          sl.sync();
        },
      });
      await sl.fly(SLEIGH_PARK, { speed: 220 }).done;
      sl.dir = 1;
      sl.park();
    } else await this.wait(600);
    await this.pan(this.santa.x, this.santa.y - 10, 1000);
    this.follow(this.santa.sprite);
    this.santa.cheer();
    this.emit({ type: "celebrate" });
    this.toast(COPY.toast.complete, COPY.toast.completeBody);
    await this.wait(1800);
    this.santa.idle();
  }

  // ---------------------------------------------------------------- the card

  /**
   * After a delivery (or when Santa revisits a served house): a few sparkles on
   * the gift, a pause, the camera settles on the house, then the UI opens the card.
   */
  private async openCard(id: HouseId, fresh: boolean): Promise<void> {
    this.setBusy(true);
    this.cardHouse = id;
    const b = BUILDINGS[id];
    const m = BUILDING_META[id];
    this.sparkles.explode(fresh ? 9 : 5, b.x + m.gift[0], b.y + m.gift[1] - 6);
    if (fresh) await this.wait(this.reduced ? 0 : 700);
    // the door line sits about a third of the way down, above the card editor
    const view = this.cameras.main.worldView;
    await this.pan(b.x + m.w / 2, b.y + m.door[1] + view.height * 0.16, 1000);
    const d = getVillage().deliveries.find((x) => x.houseId === id);
    if (!d) return this.endCard();
    this.emit({ type: "card", houseId: id, giftId: d.giftId, wrapId: d.wrapId, fresh });
  }

  /** Santa slips away from the doorstep; then the postcard scene is rendered at 1:1. */
  async leaveHouse(): Promise<{ image: HTMLImageElement; chill: number }> {
    const id = this.cardHouse;
    if (!id) throw new Error("No card in progress");
    const frame = postcardFrame(id, BUILDING_META[id]);
    const spot = this.leaveSpot(id, frame);
    if (spot) await new Promise<void>((done) => this.walk(spot, done, false) || done());
    this.santa.idle();
    await this.pan(frame[0] + frame[2] / 2, frame[1] + frame[3] * 0.4, 900);
    await this.wait(this.reduced ? 0 : 300);
    const image = await snapshotRegion(this, frame);
    return { image, chill: this.chill.alpha };
  }

  /** A few steps away from the door, on the side without the gift, inside the postcard. */
  private leaveSpot(id: HouseId, [left, top]: Rect): Pt | null {
    const m = BUILDING_META[id];
    const [sx, sy] = doorStand(id, m);
    const away = BUILDINGS[id].x + m.gift[0] >= sx ? -1 : 1;
    const tries: Pt[] = [
      [away * 48, 8],
      [away * 36, 22],
      [-away * 48, 8],
      [-away * 36, 22],
      [0, 26],
    ];
    for (const [dx, dy] of tries) {
      const p: Pt = [sx + dx, sy + dy];
      const inside =
        p[0] > left + 16 && p[0] < left + POSTCARD.w - 16 && p[1] < top + POSTCARD.cardTop - 6;
      if (!inside || !this.grid.walkable(p[0], p[1])) continue;
      const path = this.grid.path([this.santa.x, this.santa.y], p);
      if (!path) continue;
      let len = 0;
      let prev: Pt = [this.santa.x, this.santa.y];
      for (const q of path) {
        len += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
        prev = q;
      }
      if (len < 130) return p;
    }
    return null;
  }

  /** Back to the village (card finished, skipped or closed). */
  endCard(): void {
    if (!this.cardHouse) return;
    this.cardHouse = null;
    this.follow(this.santa.sprite);
    if (isComplete(getVillage()) && !this.finaleDone) {
      this.finaleDone = true;
      void this.finale().then(() => this.setBusy(false));
    } else this.setBusy(false);
  }

  // ---------------------------------------------------------------- store sync

  private onStore(): void {
    const prev = this.state;
    const next = getVillage();
    this.state = next;
    if (!prev.started && next.started) this.playIntro();
    const wasReset =
      next.deliveries.length === 0 &&
      next.sack.length === 0 &&
      (prev.deliveries.length > 0 || prev.sack.length > 0);
    if (wasReset) this.resetWorld();
    this.santa.setFull(next.sack.length > 0);
  }

  private resetWorld(): void {
    for (const [, h] of this.houses) {
      this.tweens.killTweensOf([h.lit, h.decor, h.glow]);
      h.steady = false;
      h.lit.setAlpha(0);
      h.decor.setAlpha(0);
      h.glow.setAlpha(0);
      h.gift?.destroy();
      h.gift = null;
    }
    const { lit, pile, glow, star } = this.tree;
    this.tweens.killTweensOf([lit, pile, glow, star]);
    [lit, pile, glow, star].forEach((o) => o.setAlpha(0));
    star.setScale(0.7);
    this.lightHouse("workshop", true);
    this.lamps.forEach((l) => (l.on = !this.lampWanted(l)));
    this.finaleDone = false;
    this.cardHouse = null;
    this.refreshLamps(true);
    this.santa.stop();
    this.santa.place(SPAWN);
    this.santa.setVisible(true);
    this.santa.setFull(false);
    this.santa.face("s");
    const sl = this.sleigh;
    [sl.gx, sl.gy] = SLEIGH_PARK;
    sl.dir = 1;
    sl.rider = false;
    sl.sprite.setVisible(true);
    sl.park();
    this.follow(this.santa.sprite);
  }

  // ---------------------------------------------------------------- per frame

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    const santa = this.santa;
    if (this.state.started && !this.busy && !this.intro) {
      let dx = 0;
      let dy = 0;
      for (const k of this.keys) {
        dx += KEYS[k]![0];
        dy += KEYS[k]![1];
      }
      if (dx || dy) {
        santa.nudge(dx, dy, dt);
        if (this.free) this.follow(santa.sprite);
        if (!this.keyboardMoving) this.emit({ type: "moved" });
        this.keyboardMoving = true;
      } else if (this.keyboardMoving) {
        this.keyboardMoving = false;
        santa.idle();
      }
    }
    santa.update(dt);

    const moving = santa.moving || this.keyboardMoving;
    if (this.wasMoving && !moving && this.state.started)
      dispatch({ type: "rest", pos: [Math.round(santa.x), Math.round(santa.y)] });
    this.wasMoving = moving;

    this.zoom.tick();
    this.updateBells(dt);
    this.updateAmbience();
    this.updateMarkers();
    this.updateArrow();
    const near = this.lastInputKeyboard && !this.busy ? this.nearestTarget() : null;
    const label = near ? this.nearLabel_(near) : null;
    if (label !== this.nearLabel) {
      this.nearLabel = label;
      this.emit({ type: "near", label });
    }
  }

  private nearLabel_(t: Target): string {
    if (t.kind === "sleigh") return COPY.near.sleigh;
    if (t.kind === "tree") return COPY.near.look;
    return isHouse(t.id) && !isDelivered(this.state, t.id) && this.state.sack.length
      ? COPY.near.deliver
      : COPY.near.look;
  }

  /**
   * The quiet, living layer: wind for the snow, twinkling string lights,
   * lantern flames and candlelit windows. Only what is on screen is touched.
   */
  private updateAmbience(): void {
    const t = this.time.now / 1000;
    this.wind = 5 * Math.sin(t * 0.11) + 3 * Math.sin(t * 0.29 + 1.7) + 2;
    const view = this.cameras.main.worldView;
    for (const l of this.festoons) {
      if (!l.on && !l.level && !l.bulbs[0]?.alpha) continue;
      if (!Phaser.Geom.Rectangle.Overlaps(view, l.box)) continue;
      const reveal = l.level * (l.bulbs.length + 3);
      l.bulbs.forEach((b, j) => {
        const on = Phaser.Math.Clamp(reveal - j, 0, 1);
        const k = this.reduced ? 1 : 0.5 + 0.5 * Math.sin(t * l.speed[j]! + l.phase[j]!);
        b.setAlpha(on * (0.7 + 0.3 * k));
        l.glows[j]!.setAlpha(on * (0.1 + 0.28 * k));
      });
    }
    if (this.reduced) return;
    this.flames.forEach((f, i) =>
      f.setAlpha(
        0.42 +
          0.05 * Math.sin(t * 7.3 + i) +
          0.04 * Math.sin(t * 12.7 + i * 2.1) +
          0.05 * Math.sin(t * 1.3 + i * 0.7),
      ),
    );
    let i = 0;
    for (const h of this.houses.values()) {
      i++;
      if (h.steady)
        h.lit.setAlpha(0.93 + 0.04 * Math.sin(t * 9.1 + i * 1.3) + 0.03 * Math.sin(t * 2.3 + i));
    }
  }

  /** Now and then a glint of moonlight on the frozen river or pond, if it's on screen. */
  private glint(): void {
    const v = this.cameras.main.worldView;
    for (let n = 0; n < 8; n++) {
      const p: Pt = [v.x + Math.random() * v.width, v.y + Math.random() * v.height];
      if (!isWater(p)) continue;
      const g = this.add
        .image(Math.round(p[0]), Math.round(p[1]), "effects/twinkle.png")
        .setBlendMode(ADD)
        .setDepth(-390)
        .setAlpha(0);
      this.tweens.add({
        targets: g,
        alpha: 0.7,
        duration: 450,
        yoyo: true,
        ease: "Sine.easeInOut",
        onComplete: () => g.destroy(),
      });
      return;
    }
  }

  /** Bells follow the team's speed and fade as it leaves the screen. */
  private updateBells(dt: number): void {
    const sl = this.sleigh;
    const [x, y] = sl.visual;
    const speed = Math.hypot(x - this.bellsAt[0], y - this.bellsAt[1]) / Math.max(dt, 0.001);
    this.bellsAt = [x, y];
    const v = this.cameras.main.worldView;
    const away = Math.hypot(Math.max(v.x - x, 0, x - v.right), Math.max(v.y - y, 0, y - v.bottom));
    const seen = sl.sprite.visible ? Math.max(0, 1 - away / 140) : 0;
    setBells(sl.alt > 2 ? Math.min(1, speed / 90) * seen : 0);
  }

  private updateMarkers(): void {
    const carrying = this.state.sack.length > 0 && !this.busy;
    for (const id of HOUSE_IDS) {
      const h = this.houses.get(id)!;
      const [x, y] = doorStand(id, BUILDING_META[id]);
      const show =
        carrying &&
        !isDelivered(this.state, id) &&
        (id === this.guide || Math.hypot(x - this.santa.x, y - this.santa.y) < 170);
      h.marker!.setVisible(show);
    }
  }

  /**
   * One quiet pointer at the screen's edge toward the next goal when it's off
   * screen: the sleigh while the sack is empty, otherwise the nearest house
   * still waiting (by walking distance, rechecked every 1.5 s). Nothing once
   * the village is complete.
   */
  private updateArrow(): void {
    const s = this.state;
    let target: Pt | null = null;
    let house = false;
    if (s.started && !this.busy && !this.intro && !isComplete(s)) {
      if (s.sack.length) {
        const stale = this.guide && isDelivered(s, this.guide);
        if (stale || this.time.now - this.guideAt > 1500) {
          this.guideAt = this.time.now;
          this.guide = this.nearestHouse();
        }
        if (this.guide) [target, house] = [doorStand(this.guide, BUILDING_META[this.guide]), true];
      } else if (giftsLeftToLoad(s) > 0) target = SLEIGH_PICKUP;
    }
    // Drawn in screen space (scroll factor 0), so it sits still at the edge
    // while the camera glides: no per-frame wobble.
    const cam = this.cameras.main;
    const z = cam.zoom;
    const [W, H] = [cam.width, cam.height];
    // keep clear of the HUD (top), the hint (bottom) and the side buttons
    const inner = new Phaser.Geom.Rectangle(26, 132, W - 26 - 70, H - 132 - 104);
    const ts: Pt | null = target && [
      (target[0] - cam.midPoint.x) * z + W / 2,
      (target[1] - cam.midPoint.y) * z + H / 2,
    ];
    // only for goals that are really off screen; a 16 px band either side of
    // the edge stops it flickering on and off as the camera glides
    const m = this.arrowAt ? -16 : 16;
    const offscreen = ts && (ts[0] < -m || ts[1] < -m || ts[0] > W + m || ts[1] > H + m);
    if (!ts || !offscreen || inner.width <= 0 || inner.height <= 0) {
      this.arrow.setVisible(false);
      this.arrowGift.setVisible(false);
      this.arrowAt = null;
      return;
    }
    const a = Math.atan2(ts[1] - inner.centerY, ts[0] - inner.centerX);
    const k = Math.min(
      inner.width / 2 / Math.abs(Math.cos(a) || 1e-6),
      inner.height / 2 / Math.abs(Math.sin(a) || 1e-6),
    );
    const at = (d: number): Pt => [
      Math.round(inner.centerX + Math.cos(a) * d),
      Math.round(inner.centerY + Math.sin(a) * d),
    ];
    // scroll-factor-0 objects are still zoomed about the screen centre
    const place = ([sx, sy]: Pt): Pt => [W / 2 + (sx - W / 2) / z, H / 2 + (sy - H / 2) / z];
    const scale = 3 / z; // one art pixel = 3 screen pixels at any zoom
    const tip = at(k);
    this.arrow
      .setVisible(true)
      .setScale(scale)
      .setPosition(...place(tip))
      .setRotation(a - Math.PI / 2);
    const box = at(k - 34);
    this.arrowGift
      .setVisible(house)
      .setScale(scale)
      .setPosition(...place(box));
    this.arrowAt = { at: house ? box : tip, house };
  }

  // ---------------------------------------------------------------- photo

  async capture(): Promise<{ image: HTMLImageElement; chill: number }> {
    const W = 180;
    const H = 320;
    const left = Phaser.Math.Clamp(Math.round(this.santa.x - W / 2), 0, WORLD.w - W);
    const top = Phaser.Math.Clamp(Math.round(this.santa.y - H * 0.62), 0, WORLD.h - H);
    const image = await snapshotRegion(this, [left, top, W, H]);
    return { image, chill: this.chill.alpha };
  }
}
