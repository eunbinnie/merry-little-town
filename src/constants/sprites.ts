// Typed view of the metadata written by `pnpm assets:generate`.
import data from "./sprites.json";
import type { BuildingId, BuildingMeta } from "@/game/world";

type Anims = Record<string, number[]>;

export const SPRITE_SIZES = data.sizes as unknown as Record<string, [number, number]>;
export const BUILDING_META = data.buildings as unknown as Record<BuildingId, BuildingMeta>;
export const SANTA_META = data.santa as { w: number; h: number; footY: number; anims: Anims };
export const SLEIGH_META = data.sleigh as unknown as {
  w: number;
  h: number;
  groundY: number;
  nose: [number, number];
  anims: Anims;
};
