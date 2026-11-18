// Pure game rules for the village. No React, no browser APIs, no imports —
// so the Node test runner can load this file directly.

export const HOUSE_IDS = [
  "townhouse",
  "woodland-cabin",
  "red-cottage",
  "bakery",
  "stone-cottage",
] as const;
export type HouseId = (typeof HOUSE_IDS)[number];

export const GIFT_IDS = [
  "teddy-bear",
  "gingerbread",
  "stocking",
  "snow-globe",
  "scarf",
  "candy-cane",
  "mini-tree",
  "golden-star",
] as const;
export type GiftId = (typeof GIFT_IDS)[number];

export const WRAP_IDS = ["crimson", "pine", "ivory", "midnight"] as const;
export type WrapId = (typeof WRAP_IDS)[number];

export const PHASES = ["landing", "village", "opening", "selecting", "complete"] as const;
/**
 * landing   – title screen
 * village   – waiting for the next gift box to be opened
 * opening   – a gift box has been drawn (and maybe opened)
 * selecting – choosing which house receives the current gift
 * complete  – all houses have their gift
 */
export type Phase = (typeof PHASES)[number];

export type DrawnGift = { giftId: GiftId; wrapId: WrapId; opened: boolean };
export type Delivery = { houseId: HouseId; giftId: GiftId; wrapId: WrapId };

export type VillageState = {
  version: 1;
  phase: Phase;
  currentGift: DrawnGift | null;
  deliveries: Delivery[]; // in delivery order
};

export type Action =
  | { type: "start" }
  /** `random` values in [0, 1) are injected so the reducer stays pure. */
  | { type: "drawGift"; random: number; wrapRandom: number }
  | { type: "openGift" }
  | { type: "chooseHouse" }
  | { type: "deliver"; houseId: HouseId }
  | { type: "reset" };

export const INITIAL_STATE: VillageState = {
  version: 1,
  phase: "landing",
  currentGift: null,
  deliveries: [],
};

export const isDelivered = (s: VillageState, id: HouseId): boolean =>
  s.deliveries.some((d) => d.houseId === id);

export const isComplete = (s: VillageState): boolean => s.deliveries.length === HOUSE_IDS.length;

const pick = <T>(list: readonly T[], random: number): T =>
  list[Math.min(list.length - 1, Math.floor(random * list.length))]!;

/** Invalid transitions return the same state object, so callers can detect no-ops. */
export function reduce(s: VillageState, a: Action): VillageState {
  switch (a.type) {
    case "start":
      return s.phase === "landing" ? { ...s, phase: isComplete(s) ? "complete" : "village" } : s;

    case "drawGift": {
      if (s.phase !== "village" || s.currentGift || isComplete(s)) return s;
      // every house gets a different gift
      const used = new Set(s.deliveries.map((d) => d.giftId));
      const pool = GIFT_IDS.filter((g) => !used.has(g));
      return {
        ...s,
        phase: "opening",
        currentGift: {
          giftId: pick(pool, a.random),
          wrapId: pick(WRAP_IDS, a.wrapRandom),
          opened: false,
        },
      };
    }

    case "openGift":
      if (s.phase !== "opening" || !s.currentGift || s.currentGift.opened) return s;
      return { ...s, currentGift: { ...s.currentGift, opened: true } };

    case "chooseHouse":
      if (s.phase !== "opening" || !s.currentGift?.opened) return s;
      return { ...s, phase: "selecting" };

    case "deliver": {
      const g = s.currentGift;
      if (s.phase !== "selecting" || !g || isDelivered(s, a.houseId)) return s;
      const deliveries = [
        ...s.deliveries,
        { houseId: a.houseId, giftId: g.giftId, wrapId: g.wrapId },
      ];
      return {
        ...s,
        deliveries,
        currentGift: null,
        phase: deliveries.length === HOUSE_IDS.length ? "complete" : "village",
      };
    }

    case "reset":
      return { ...INITIAL_STATE, phase: "village" };
  }
}

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);

/** Validate untrusted (stored) data. Returns null for anything inconsistent. */
export function parseState(raw: unknown): VillageState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1 || !isOneOf(PHASES, r.phase) || !Array.isArray(r.deliveries)) return null;

  const deliveries: Delivery[] = [];
  for (const d of r.deliveries as unknown[]) {
    if (!d || typeof d !== "object") return null;
    const { houseId, giftId, wrapId } = d as Record<string, unknown>;
    if (!isOneOf(HOUSE_IDS, houseId) || !isOneOf(GIFT_IDS, giftId) || !isOneOf(WRAP_IDS, wrapId))
      return null;
    if (deliveries.some((x) => x.houseId === houseId || x.giftId === giftId)) return null;
    deliveries.push({ houseId, giftId, wrapId });
  }

  let currentGift: DrawnGift | null = null;
  if (r.currentGift != null) {
    const { giftId, wrapId, opened } = r.currentGift as Record<string, unknown>;
    if (!isOneOf(GIFT_IDS, giftId) || !isOneOf(WRAP_IDS, wrapId) || typeof opened !== "boolean")
      return null;
    currentGift = { giftId, wrapId, opened };
  }

  const state: VillageState = { version: 1, phase: r.phase, currentGift, deliveries };
  const done = deliveries.length === HOUSE_IDS.length;
  const needsGift = state.phase === "opening" || state.phase === "selecting";
  if (state.phase === "complete" ? !done : done && state.phase !== "landing") return null;
  if (needsGift !== (currentGift !== null)) return null;
  if (state.phase === "selecting" && !currentGift?.opened) return null;
  return state;
}
