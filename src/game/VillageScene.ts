// The explorable village. Santa walks where you tap (A* over a walkability
// grid), the camera follows, and gifts are physically loaded at the sleigh and
// placed at doors. React owns the overlay UI; this scene emits events to it.
import * as Phaser from "phaser";
import { BUILDING_META, SPRITE_SIZES, SANTA_META, SLEIGH_META } from "@/constants/sprites";
import { BUILDING_NAMES, BUILDING_NOTES, COPY, GIFTS, HOUSE_NAMES } from "@/constants/copy";
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
  doorStand,
  obstacles,
  sizesOf,
  worldProps,
  type BuildingId,
  type LampGroup,
  type Pt,
} from "./world";
import { Grid } from "./grid";
import { Santa, createSantaAnims } from "./Santa";
import { Sleigh, createSleighAnims } from "./Sleigh";
import { UI_FLAG, snapshotRegion } from "./capture";
import type { Destination, GameEvent } from "./types";

type Img = Phaser.GameObjects.Image;
type Target = { kind: "building"; id: BuildingId } | { kind: "sleigh" } | { kind: "tree" };
type House = { lit: Img; decor: Img; glow: Img; marker: Img | null; gift: Img | null };
type Lamp = { lit: Img; glow: Img; pool: Img; group: LampGroup; step?: number; on: boolean };

const ADD = Phaser.BlendModes.ADD;
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
    const sizes = sizesOf(BUILDING_META);
    const props = worldProps(sizes);
    this.grid = new Grid(obstacles(sizes, props));
    createSantaAnims(this);
    createSleighAnims(this);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD.w, WORLD.h).setBackgroundColor(SKY_TOP).setRoundPixels(true);
    this.fitZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitZoom, this);

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
    }
    this.buildLamps();
    this.buildEffects();

    this.sleigh = new Sleigh(this, SLEIGH_PARK);
    const pos = this.state.pos;
    const start: Pt = pos && this.grid.walkable(pos[0], pos[1]) ? pos : SPAWN;
    this.santa = new Santa(this, this.grid, start);
    this.santa.setFull(this.state.sack.length > 0);

    this.ring = this.ui(this.add.image(0, 0, "effects/tap.png").setDepth(-450).setVisible(false));
    this.arrow = this.ui(
      this.add.image(0, 0, "effects/marker.png").setDepth(9900).setVisible(false),
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

  private fitZoom(): void {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setZoom(Math.max(2, Math.round(Math.min(width, height) / 280)));
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
      this.houses.set(id, { lit, decor, glow, marker, gift: null });
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

  private buildEffects(): void {
    const cam = this.cameras.main;
    const rx = () => cam.worldView.x - 8 + Math.random() * (cam.worldView.width + 16);
    const ry = () => cam.worldView.y - 8 + Math.random() * (cam.worldView.height + 16);
    const fade = (t: number) => Math.sin(t * Math.PI);
    const slow = this.reduced ? 0.25 : 1;
    // far, small flakes and near, bigger ones drifting a little faster
    for (const [tex, freq, speed, depth] of [
      ["effects/dot.png", 36, 10, 9500],
      ["effects/flake.png", 140, 17, 9501],
    ] as const) {
      this.snow.push(
        this.add
          .particles(0, 0, tex, {
            x: { onEmit: rx },
            y: { onEmit: ry },
            lifespan: { min: 4500, max: 8000 },
            speedY: { min: speed * 0.6 * slow, max: speed * slow },
            speedX: { min: -3 * slow, max: 4 * slow },
            alpha: { start: 0, end: 0.95, ease: fade },
            frequency: this.reduced ? freq * 3 : freq,
          })
          .setDepth(depth),
      );
    }
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

  private lampWanted(l: Lamp): boolean {
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
    const chill = this.chillFor(this.state);
    if (instant) this.chill.setAlpha(chill);
    else this.tweens.add({ targets: this.chill, alpha: chill, duration: 1500 });
  }

  private lightHouse(id: BuildingId, instant: boolean): Promise<void> {
    const h = this.houses.get(id)!;
    this.tweens.killTweensOf([h.lit, h.decor, h.glow]);
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
    this.tweens.add({ targets: h.lit, alpha: 1, duration: 700 });
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
    if (!this.state.started || this.busy || this.intro) return;
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

  private walk(goal: Pt, then?: () => void): boolean {
    const path = this.grid.path([this.santa.x, this.santa.y], goal);
    if (!path) {
      this.toast(COPY.toast.unreachable);
      return false;
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
    this.emit({ type: "moved" });
    return true;
  }

  private goToTarget(t: Target): void {
    this.walk(this.standOf(t), () => this.interact(t));
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
    if (isDelivered(s, id)) {
      this.toast(HOUSE_NAMES[id], COPY.toast.already);
      const b = BUILDINGS[id];
      const m = BUILDING_META[id];
      this.sparkles.explode(6, b.x + m.gift[0], b.y + m.gift[1] - 6);
      return;
    }
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
    await this.tween({
      targets: boxes,
      angle: { from: -12, to: 12 },
      duration: 90,
      yoyo: true,
      repeat: 2,
    });
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
    this.puffAt(b.x + m.gift[0], b.y + m.gift[1], 5);
    await this.wait(300);
    santa.pose(2);
    await this.wait(240);
    dispatch({ type: "deliver", houseId: id });
    santa.setFull(getVillage().sack.length > 0);
    santa.idle();
    await this.lightHouse(id, false);
    this.refreshLamps(false);
    this.toast(COPY.toast.delivered(HOUSE_NAMES[id], GIFTS[gift.giftId].name));
    if (isComplete(getVillage())) await this.finale();
    this.setBusy(false);
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
    await this.tween({ targets: box, scaleY: 0, scaleX: 0.6, y: chimney[1] + 2, duration: 160 });
    box.destroy();
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
    this.follow(santa.sprite);
    this.toast(COPY.toast.delivered(HOUSE_NAMES[id], GIFTS[gift.giftId].name));
    const home = sl.fly(SLEIGH_PARK, { cruise: 60, speed: 200 }).done.then(() => {
      sl.dir = 1;
      sl.park();
    });
    if (isComplete(getVillage())) {
      await home;
      await this.finale();
    }
    this.setBusy(false);
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
    await this.pan(TREE.x + 33, TREE.y + 64, 1400);
    this.lightTree(false);
    NEIGHBOURS.forEach((id) => void this.lightHouse(id, false));
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

  private updateMarkers(): void {
    const carrying = this.state.sack.length > 0 && !this.busy;
    for (const id of HOUSE_IDS) {
      const h = this.houses.get(id)!;
      const [x, y] = doorStand(id, BUILDING_META[id]);
      const show =
        carrying &&
        !isDelivered(this.state, id) &&
        Math.hypot(x - this.santa.x, y - this.santa.y) < 170;
      h.marker!.setVisible(show);
    }
  }

  /** Points at the sleigh when the sack is empty (or the tree once done) if it's off-screen. */
  private updateArrow(): void {
    const s = this.state;
    let target: Pt | null = null;
    if (s.started && !this.busy && !this.intro) {
      if (!s.sack.length && giftsLeftToLoad(s) > 0) target = SLEIGH_PICKUP;
      else if (isComplete(s)) target = TREE_STAND;
    }
    const v = this.cameras.main.worldView;
    const inset = 12;
    if (
      !target ||
      (target[0] > v.x + inset &&
        target[0] < v.right - inset &&
        target[1] > v.y + inset &&
        target[1] < v.bottom - inset)
    ) {
      this.arrow.setVisible(false);
      return;
    }
    const cx = v.centerX;
    const cy = v.centerY;
    const a = Math.atan2(target[1] - cy, target[0] - cx);
    const hw = v.width / 2 - inset;
    const hh = v.height / 2 - inset;
    const k = Math.min(hw / Math.abs(Math.cos(a) || 1e-6), hh / Math.abs(Math.sin(a) || 1e-6));
    const bob = Math.sin(this.time.now / 220) * 1.5;
    this.arrow
      .setVisible(true)
      .setPosition(
        Math.round(cx + Math.cos(a) * (k - bob)),
        Math.round(cy + Math.sin(a) * (k - bob)),
      )
      .setRotation(a - Math.PI / 2);
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
