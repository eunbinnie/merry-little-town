// Village layout in art pixels, shared by the live scene, the postcard export
// and the asset generator. The 256×384 core is always fully framed on screen;
// tiled layers extend the landscape sideways on wide screens.
import type { HouseId } from "../features/village/game.ts";

export const CORE = { w: 256, h: 384 } as const;
/** Vertical band (core y) that must never sit under the UI bars. */
export const FOCUS = { top: 96, bottom: 342 } as const;

export const ASSET_ROOT = "/assets/christmas";

export type Spot = { x: number; y: number };

/** Horizontally repeating layers; `y` is the top edge in core space. */
export const TILES = {
  sky: { src: "backgrounds/sky.png", y: -8, w: 4, h: 176 },
  stars: { src: "backgrounds/stars.png", y: 0, w: 256, h: 150 },
  mountains: { src: "backgrounds/mountains.png", y: 96, w: 512, h: 76 },
  forest: { src: "backgrounds/forest.png", y: 134, w: 256, h: 46 },
  ground: { src: "backgrounds/ground.png", y: 164, w: 256, h: 236 },
} as const;

/** Drawn last, in front of the village. */
export const FOREGROUND = { src: "backgrounds/foreground.png", y: 350, w: 256, h: 40 } as const;

export const SKY_TOP = "#0a101d";
export const SNOW_FIELD = "#b4c5dd";

/** Upper left, matching the light direction baked into every sprite. */
export const MOON: Spot = { x: 8, y: 26 };

/** Top-left of each house sprite. Sorted back to front by baseline. */
export const HOUSE_SPOTS: Record<HouseId, Spot> = {
  townhouse: { x: 12, y: 98 },
  "woodland-cabin": { x: 168, y: 138 },
  "red-cottage": { x: 0, y: 208 },
  bakery: { x: 168, y: 200 },
  "stone-cottage": { x: 90, y: 276 },
};

export const TREE: Spot = { x: 95, y: 124 };

/** Scenery sprites; `z` is the baseline used for depth sorting against houses. */
export const PROPS: ReadonlyArray<Spot & { src: string; z: number; litSrc?: string }> = [
  { src: "decorations/pine-small.png", x: 76, y: 150, z: 182 },
  { src: "decorations/pine-tiny.png", x: 160, y: 166, z: 186 },
  { src: "decorations/pine-large.png", x: 228, y: 156, z: 206 },
  { src: "decorations/pine-small.png", x: 70, y: 196, z: 228 },
  {
    src: "decorations/lamppost.png",
    litSrc: "decorations/lamppost-lit.png",
    x: 84,
    y: 214,
    z: 244,
  },
  {
    src: "decorations/lamppost.png",
    litSrc: "decorations/lamppost-lit.png",
    x: 163,
    y: 214,
    z: 244,
  },
  { src: "decorations/pine-tiny.png", x: 152, y: 230, z: 250 },
  {
    src: "decorations/lamppost.png",
    litSrc: "decorations/lamppost-lit.png",
    x: 70,
    y: 300,
    z: 330,
  },
  {
    src: "decorations/lamppost.png",
    litSrc: "decorations/lamppost-lit.png",
    x: 178,
    y: 300,
    z: 330,
  },
  { src: "decorations/pine-large.png", x: -10, y: 304, z: 354 },
  { src: "decorations/pine-small.png", x: 18, y: 330, z: 362 },
  { src: "decorations/pine-large.png", x: 232, y: 300, z: 350 },
  { src: "decorations/pine-small.png", x: 216, y: 334, z: 366 },
];

/** Stars that twinkle (CSS animation) on top of the static star tile. */
export const TWINKLES: readonly Spot[] = [
  { x: 18, y: 16 },
  { x: 58, y: 46 },
  { x: 102, y: 20 },
  { x: 138, y: 64 },
  { x: 172, y: 8 },
  { x: 240, y: 52 },
  { x: 34, y: 86 },
  { x: 214, y: 92 },
];
