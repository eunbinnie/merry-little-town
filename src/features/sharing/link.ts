// A card someone sent, carried in the link's hash (#c=…). The hash never
// reaches the server, so the card still isn't stored or sent anywhere except
// where the sender shares the link. Pure (no DOM), so Node can test it.
import { GIFT_IDS, HOUSE_IDS, WRAP_IDS, isOneOf, type Delivery } from "../village/game.ts";
import { CARD_LIMITS, clampText } from "./text.ts";
import type { CardText } from "./card.ts";

export type ReceivedCard = Delivery & CardText;

const KEY = "c=";

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const fromBase64Url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/** The hash part of a card link, starting with "#". */
export function encodeCardHash(c: ReceivedCard): string {
  const json = JSON.stringify({
    v: 1,
    h: c.houseId,
    g: c.giftId,
    w: c.wrapId,
    t: c.to,
    m: c.message,
    f: c.from,
  });
  return `#${KEY}${toBase64Url(new TextEncoder().encode(json))}`;
}

/** Anyone can write a link, so everything is validated; anything odd is null. */
export function decodeCardHash(hash: string): ReceivedCard | null {
  const raw = hash.replace(/^#/, "");
  if (!raw.startsWith(KEY)) return null;
  try {
    const bytes = fromBase64Url(raw.slice(KEY.length));
    const r = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as Record<
      string,
      unknown
    >;
    if (r.v !== 1) return null;
    if (!isOneOf(HOUSE_IDS, r.h) || !isOneOf(GIFT_IDS, r.g) || !isOneOf(WRAP_IDS, r.w)) return null;
    if (typeof r.t !== "string" || typeof r.m !== "string" || typeof r.f !== "string") return null;
    const to = clampText(r.t, CARD_LIMITS.to, 1).trim();
    const message = clampText(r.m, CARD_LIMITS.message, CARD_LIMITS.messageLines).trim();
    if (!to || !message) return null;
    return {
      houseId: r.h,
      giftId: r.g,
      wrapId: r.w,
      to,
      message,
      from: clampText(r.f, CARD_LIMITS.from, 1).trim(),
    };
  } catch {
    return null;
  }
}
