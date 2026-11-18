// Typed view over the generated sprite metadata (`pnpm assets:generate`).
import data from "./sprites.json";
import type { HouseId } from "@/features/village/game";

type XY = readonly [number, number];

export const SPRITE_SIZES = data.sizes as unknown as Readonly<Record<string, XY>>;

export const HOUSE_META = data.houses as unknown as Readonly<
  Record<HouseId, { w: number; h: number; top: number; door: XY; gift: XY; smoke: XY }>
>;

export function spriteSize(rel: string): XY {
  const size = SPRITE_SIZES[rel];
  if (!size) throw new Error(`Unknown sprite: ${rel}`);
  return size;
}
