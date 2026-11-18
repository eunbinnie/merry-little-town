import type { GiftId } from "@/features/village/game";
import type { BuildingId } from "./world";

/** Things the game tells the React UI. */
export type GameEvent =
  | { type: "ready" }
  | { type: "intro"; playing: boolean }
  | { type: "busy"; busy: boolean }
  | { type: "toast"; title: string; body?: string; items?: GiftId[] }
  | { type: "moved" }
  | { type: "near"; label: string | null }
  | { type: "celebrate" };

export type Destination = BuildingId | "sleigh" | "tree";

/** What the React UI can ask of the running game. */
export type GameHandle = {
  skipIntro(): void;
  goTo(target: Destination): void;
  capture(): Promise<{ image: HTMLImageElement; chill: number }>;
  destroy(): void;
};
