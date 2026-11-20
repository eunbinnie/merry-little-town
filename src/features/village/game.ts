// Pure game rules for the village. No React, no browser APIs, no imports —
// so the Node test runner can load this file directly.

/** Houses that wait for a gift (a subset of the map's buildings). */
export const HOUSE_IDS = [
  "townhouse",
  "red-cottage",
  "bakery",
  "tea-house",
  "stone-cottage",
  "woodland-cabin",
  "a-frame",
] as const;
export type HouseId = (typeof HOUSE_IDS)[number];

/** Its door is snowed in: Rudolph flies Santa up to the chimney instead. */
export const CHIMNEY_HOUSE: HouseId = "townhouse";

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

/** How many wrapped gifts fit in Santa's sack at once. */
export const SACK_SIZE = 3;

export type Gift = { giftId: GiftId; wrapId: WrapId };
export type Delivery = Gift & { houseId: HouseId };

export type VillageState = {
  version: 2;
  /** The sleigh has landed (intro seen or skipped). */
  started: boolean;
  /** Gifts in Santa's sack, delivered first-in first-out. */
  sack: Gift[];
  deliveries: Delivery[]; // in delivery order
  /** Where Santa last stood still, in world pixels. */
  pos: [number, number] | null;
};

export type Action =
  | { type: "start" }
  /** Fill the sack. `random` values in [0, 1) are injected so the reducer stays pure. */
  | { type: "load"; random: readonly number[] }
  | { type: "deliver"; houseId: HouseId }
  | { type: "rest"; pos: [number, number] }
  | { type: "reset" };

export const INITIAL_STATE: VillageState = {
  version: 2,
  started: false,
  sack: [],
  deliveries: [],
  pos: null,
};

export const isDelivered = (s: VillageState, id: HouseId): boolean =>
  s.deliveries.some((d) => d.houseId === id);

export const isComplete = (s: VillageState): boolean => s.deliveries.length === HOUSE_IDS.length;

/** Gifts still to be loaded into the sack before every house is served. */
export const giftsLeftToLoad = (s: VillageState): number =>
  HOUSE_IDS.length - s.deliveries.length - s.sack.length;

const pick = <T>(list: readonly T[], random: number): T =>
  list[Math.min(list.length - 1, Math.floor(random * list.length))]!;

/** Invalid transitions return the same state object, so callers can detect no-ops. */
export function reduce(s: VillageState, a: Action): VillageState {
  switch (a.type) {
    case "start":
      return s.started ? s : { ...s, started: true };

    case "load": {
      const n = Math.min(SACK_SIZE - s.sack.length, giftsLeftToLoad(s));
      if (!s.started || n <= 0) return s;
      // every house gets a different gift
      const used = new Set([...s.deliveries, ...s.sack].map((g) => g.giftId));
      const sack = [...s.sack];
      for (let i = 0; i < n; i++) {
        const pool = GIFT_IDS.filter((g) => !used.has(g));
        const giftId = pick(pool, a.random[i * 2] ?? Math.random());
        used.add(giftId);
        sack.push({ giftId, wrapId: pick(WRAP_IDS, a.random[i * 2 + 1] ?? Math.random()) });
      }
      return { ...s, sack };
    }

    case "deliver": {
      const [gift, ...rest] = s.sack;
      if (!gift || isDelivered(s, a.houseId)) return s;
      return { ...s, sack: rest, deliveries: [...s.deliveries, { ...gift, houseId: a.houseId }] };
    }

    case "rest":
      if (s.pos && s.pos[0] === a.pos[0] && s.pos[1] === a.pos[1]) return s;
      return { ...s, pos: [a.pos[0], a.pos[1]] };

    case "reset":
      return { ...INITIAL_STATE, started: true };
  }
}

export const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);

function parseGift(raw: unknown): Gift | null {
  if (!raw || typeof raw !== "object") return null;
  const { giftId, wrapId } = raw as Record<string, unknown>;
  return isOneOf(GIFT_IDS, giftId) && isOneOf(WRAP_IDS, wrapId) ? { giftId, wrapId } : null;
}

function parseDeliveries(raw: unknown): Delivery[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Delivery[] = [];
  for (const d of raw as unknown[]) {
    const gift = parseGift(d);
    const houseId = (d as Record<string, unknown> | null)?.houseId;
    if (!gift || !isOneOf(HOUSE_IDS, houseId)) return null;
    if (out.some((x) => x.houseId === houseId)) return null;
    out.push({ ...gift, houseId });
  }
  return out;
}

function consistent(s: VillageState): VillageState | null {
  const gifts = [...s.deliveries, ...s.sack].map((g) => g.giftId);
  if (new Set(gifts).size !== gifts.length) return null;
  if (s.sack.length > SACK_SIZE || gifts.length > HOUSE_IDS.length) return null;
  return s;
}

/**
 * Validate untrusted (stored) data. Returns null for anything inconsistent.
 * Version 1 saves (the single-screen village) are migrated: their houses
 * still exist, and an undelivered gift moves into the sack.
 */
export function parseState(raw: unknown): VillageState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const deliveries = parseDeliveries(r.deliveries);
  if (!deliveries) return null;

  if (r.version === 1) {
    const current = r.currentGift == null ? null : parseGift(r.currentGift);
    if (r.currentGift != null && !current) return null;
    return consistent({
      version: 2,
      started: r.phase !== "landing",
      sack: current ? [current] : [],
      deliveries,
      pos: null,
    });
  }

  if (r.version !== 2 || typeof r.started !== "boolean" || !Array.isArray(r.sack)) return null;
  const sack: Gift[] = [];
  for (const g of r.sack as unknown[]) {
    const gift = parseGift(g);
    if (!gift) return null;
    sack.push(gift);
  }
  let pos: [number, number] | null = null;
  if (r.pos != null) {
    const p = r.pos as unknown[];
    if (!Array.isArray(p) || p.length !== 2 || !p.every((v) => Number.isFinite(v))) return null;
    pos = [p[0] as number, p[1] as number];
  }
  return consistent({ version: 2, started: r.started, sack, deliveries, pos });
}
