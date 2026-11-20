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
  /** Walk to the nearest house still waiting for a gift. */
  goToNearest(): void;
  zoomBy(dir: 1 | -1): void;
  /** Glide the camera back to Santa and follow him again. */
  recenter(): void;
  /** Santa's position in world pixels (for the village map). */
  santaAt(): readonly [number, number];
  capture(): Promise<SceneShot>;
  /** Santa slips away from the house of the open card; resolves with the postcard scene. */
  leaveHouse(): Promise<SceneShot>;
  /** Close the card flow and give the village back to the player. */
  endCard(): void;
  /** A gift from a card link: light that house and show the gift. Shown only, never saved. */
  showGuestGift(houseId: HouseId, wrapId: WrapId): Promise<void>;
  /** The received card was read: the guest gift goes and the village is the player's again. */
  clearGuestGift(): void;
  destroy(): void;
};
