import type { GiftId, HouseId, WrapId } from "@/features/village/game";
import type { BuildingId } from "./world";

/** Things the game tells the React UI. */
export type GameEvent =
  | { type: "ready" }
  | { type: "intro"; playing: boolean }
  | { type: "busy"; busy: boolean }
  | { type: "toast"; title: string; body?: string; items?: GiftId[] }
  | { type: "moved" }
  | { type: "near"; label: string | null }
  | { type: "celebrate" }
  /** A house just received its gift (fresh), or Santa came back to it: time for a card. */
  | { type: "card"; houseId: HouseId; giftId: GiftId; wrapId: WrapId; fresh: boolean };

export type Destination = BuildingId | "sleigh" | "tree";

/** A 1:1 render of part of the world plus the night tint it was shown with. */
export type SceneShot = { image: HTMLImageElement; chill: number };

/** What the React UI can ask of the running game. */
export type GameHandle = {
  skipIntro(): void;
  goTo(target: Destination): void;
  capture(): Promise<SceneShot>;
  /** Santa slips away from the house of the open card; resolves with the postcard scene. */
  leaveHouse(): Promise<SceneShot>;
  /** Close the card flow and give the village back to the player. */
  endCard(): void;
  destroy(): void;
};
