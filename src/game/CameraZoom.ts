// Zooming the village: mouse wheel, trackpad pinch (ctrl+wheel, or Safari's
// gesture events), two-finger pinch on touch screens and the zoom buttons.
// While a gesture runs the zoom follows it continuously; when it ends the
// camera eases to the nearest whole zoom, where every art pixel is the same
// size on screen and the pixel art stays crisp.
import * as Phaser from "phaser";
import { loadView, saveView } from "@/lib/storage/view-storage";
import { WORLD } from "./world";

type Hooks = {
  /** Zoom is only for free exploration (not intros, deliveries or cards). */
  canZoom(): boolean;
  /** Santa is walking: keep tracking him and zoom around the centre. */
  tracking(): boolean;
  /** The camera let go of Santa to look at another spot. */
  release(): void;
};

const SLOP = 12; // px a finger may wander and still count as a tap

export class CameraZoom {
  private base = 2;
  private min = 2;
  private fitMin = 2;
  private max = 4;
  private step = loadView().zoomStep;
  private settleTimer = 0;
  private settleTween: Phaser.Tweens.Tween | null = null;
  private pinch: { d0: number; z0: number } | null = null;
  private safari: { z0: number } | null = null;
  /** A second finger joined this touch; nothing in it may count as a tap. */
  private multi = false;
  private readonly cam: Phaser.Cameras.Scene2D.Camera;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly hooks: Hooks,
  ) {
    this.cam = scene.cameras.main;
    scene.input.addPointer(1); // two touches for pinching
    const canvas = scene.game.canvas;
    const wheel = (e: WheelEvent) => this.onWheel(e);
    const gStart = (e: Event) => this.onGesture(e, "start");
    const gChange = (e: Event) => this.onGesture(e, "change");
    const gEnd = (e: Event) => this.onGesture(e, "end");
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("gesturestart", gStart, { passive: false });
    canvas.addEventListener("gesturechange", gChange, { passive: false });
    canvas.addEventListener("gestureend", gEnd, { passive: false });
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => {
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("gesturestart", gStart);
      canvas.removeEventListener("gesturechange", gChange);
      canvas.removeEventListener("gestureend", gEnd);
      window.clearTimeout(this.settleTimer);
    });
    this.fit();
  }

  /** Recompute the zoom range for the screen and apply the preferred zoom. */
  fit(): void {
    const { width, height } = this.scene.scale.gameSize;
    this.base = Math.max(2, Math.round(Math.min(width, height) / 280));
    // never zoom out past the map's edges
    this.fitMin = Math.max(width / WORLD.w, height / WORLD.h);
    this.min = Math.max(1, Math.ceil(this.fitMin - 1e-3));
    this.max = this.base + 2;
    this.cam.setZoom(Phaser.Math.Clamp(this.base + this.step, this.min, this.max));
  }

  get zoom(): number {
    return this.cam.zoom;
  }
  get canZoomIn(): boolean {
    return this.cam.zoom < this.max - 0.01;
  }
  get canZoomOut(): boolean {
    return this.cam.zoom > this.min + 0.01;
  }

  /**
   * Zoom to `z`. With a screen point, the world under it stays put (and the
   * camera stops following Santa) unless Santa is walking.
   */
  private zoomAt(z: number, sx?: number, sy?: number): void {
    const cam = this.cam;
    const next = Phaser.Math.Clamp(z, this.fitMin, this.max);
    if (sx === undefined || sy === undefined || this.hooks.tracking()) {
      cam.setZoom(next);
      return;
    }
    const hw = cam.width / 2;
    const hh = cam.height / 2;
    const wx = cam.scrollX + hw + (sx - hw) / cam.zoom;
    const wy = cam.scrollY + hh + (sy - hh) / cam.zoom;
    this.hooks.release();
    cam.setZoom(next);
    cam.setScroll(wx - hw - (sx - hw) / next, wy - hh - (sy - hh) / next);
  }

  /** Ease to the nearest whole zoom, leaning the way the gesture went. */
  private settle(dir: number, sx?: number, sy?: number): void {
    const z = this.cam.zoom;
    const target = Phaser.Math.Clamp(
      dir > 0 ? Math.ceil(z - 0.15) : dir < 0 ? Math.floor(z + 0.15) : Math.round(z),
      this.min,
      this.max,
    );
    this.easeTo(target, sx, sy);
  }

  private easeTo(target: number, sx?: number, sy?: number): void {
    this.settleTween?.stop();
    this.step = target - this.base;
    saveView({ zoomStep: this.step });
    const from = this.cam.zoom;
    if (Math.abs(from - target) < 0.001) return;
    this.settleTween = this.scene.tweens.addCounter({
      from,
      to: target,
      duration: 220,
      ease: "Sine.easeOut",
      onUpdate: (tw) => this.zoomAt(tw.getValue() ?? target, sx, sy),
    });
  }

  /** The + / − buttons: one whole step around the centre of the screen. */
  zoomBy(dir: 1 | -1): void {
    if (!this.hooks.canZoom()) return;
    this.easeTo(Phaser.Math.Clamp(Math.round(this.cam.zoom) + dir, this.min, this.max));
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault(); // the game owns the wheel here, and browser zoom too
    if (!this.hooks.canZoom() || !e.deltaY) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const d = Phaser.Math.Clamp(e.deltaY * unit, -120, 120);
    // a trackpad pinch arrives as ctrl + wheel with small deltas
    const k = e.ctrlKey ? 0.012 : 0.0022;
    const r = this.scene.game.canvas.getBoundingClientRect();
    const [sx, sy] = [e.clientX - r.left, e.clientY - r.top];
    this.settleTween?.stop();
    this.zoomAt(this.cam.zoom * Math.exp(-d * k), sx, sy);
    window.clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => this.settle(-Math.sign(d), sx, sy), 160);
  }

  /** Safari on a Mac reports trackpad pinches as gesture events with a scale. */
  private onGesture(e: Event, phase: "start" | "change" | "end"): void {
    e.preventDefault();
    const scale = (e as Event & { scale?: number }).scale ?? 1;
    // on touch screens the pinch is handled from the touches themselves
    if (this.scene.input.pointer1.isDown || !this.hooks.canZoom()) return;
    if (phase === "start") this.safari = { z0: this.cam.zoom };
    else if (this.safari && phase === "change") this.zoomAt(this.safari.z0 * scale);
    else if (this.safari) {
      this.settle(Math.sign(scale - 1));
      this.safari = null;
    }
  }

  private fingers(): [Phaser.Input.Pointer, Phaser.Input.Pointer] | null {
    const { pointer1: a, pointer2: b } = this.scene.input;
    return a?.isDown && b?.isDown ? [a, b] : null;
  }

  private onDown(): void {
    const f = this.fingers();
    if (!f) return;
    this.multi = true; // this touch is now a pinch, never a tap
    if (!this.hooks.canZoom()) return;
    this.settleTween?.stop();
    this.pinch = {
      d0: Math.max(1, Phaser.Math.Distance.Between(f[0].x, f[0].y, f[1].x, f[1].y)),
      z0: this.cam.zoom,
    };
  }

  private onMove(): void {
    const f = this.fingers();
    if (!f || !this.pinch) return;
    const d = Phaser.Math.Distance.Between(f[0].x, f[0].y, f[1].x, f[1].y);
    this.zoomAt(this.pinch.z0 * (d / this.pinch.d0), (f[0].x + f[1].x) / 2, (f[0].y + f[1].y) / 2);
  }

  /** Called every frame: ends a pinch once a finger lifts (or the touch is cancelled). */
  tick(): void {
    if (this.pinch && !this.fingers()) {
      const grew = this.cam.zoom - this.pinch.z0;
      this.pinch = null;
      this.settle(Math.abs(grew) < 0.05 ? 0 : Math.sign(grew));
    }
    if (this.multi && !this.scene.input.pointer1.isDown && !this.scene.input.pointer2.isDown)
      this.multi = false;
  }

  /** Whether a released pointer should be ignored as a tap (part of a pinch, or a drag). */
  swallowTap(p: Phaser.Input.Pointer): boolean {
    if (this.multi || this.pinch) return true;
    return Phaser.Math.Distance.Between(p.downX, p.downY, p.upX, p.upY) > SLOP;
  }
}
