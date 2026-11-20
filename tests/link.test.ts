import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeCardHash, encodeCardHash, type ReceivedCard } from "../src/features/sharing/link.ts";

const card: ReceivedCard = {
  houseId: "bakery",
  giftId: "snow-globe",
  wrapId: "pine",
  to: "엄마",
  message: "올해도 고마워요 🎄\n사랑해요!",
  from: "지민",
};

const hashOf = (o: unknown) => "#c=" + Buffer.from(JSON.stringify(o)).toString("base64url");

test("a card survives the round trip, Korean, emoji and line breaks included", () => {
  const hash = encodeCardHash(card);
  assert.match(hash, /^#c=[A-Za-z0-9_-]+$/, "URL-safe, no padding");
  assert.deepEqual(decodeCardHash(hash), card);
  assert.deepEqual(decodeCardHash(hash.slice(1)), card, "with or without the #");
});

test("an empty From stays anonymous", () => {
  assert.equal(decodeCardHash(encodeCardHash({ ...card, from: "" }))?.from, "");
});

test("anything that isn't a valid card is ignored", () => {
  const raw = { v: 1, h: "bakery", g: "scarf", w: "ivory", t: "a", m: "b", f: "" };
  assert.ok(decodeCardHash(hashOf(raw)));
  for (const bad of [
    "",
    "#",
    "#other=1",
    "#c=",
    "#c=!!!",
    "#c=" + Buffer.from("not json").toString("base64url"),
    "#c=" + Buffer.from([0xff, 0xfe]).toString("base64url"),
    hashOf(null),
    hashOf({ ...raw, v: 2 }),
    hashOf({ ...raw, h: "chapel" }),
    hashOf({ ...raw, g: "<script>" }),
    hashOf({ ...raw, w: 3 }),
    hashOf({ ...raw, t: "  " }),
    hashOf({ ...raw, m: "" }),
    hashOf({ ...raw, f: null }),
  ])
    assert.equal(decodeCardHash(bad), null, bad);
});

test("hand-made links are held to the editor's limits", () => {
  const long = hashOf({
    v: 1,
    h: "bakery",
    g: "scarf",
    w: "ivory",
    t: "가".repeat(40),
    m: "줄\n".repeat(20) + "나".repeat(300),
    f: "이\n름",
  });
  const c = decodeCardHash(long)!;
  assert.equal(c.to.length, 20);
  assert.ok(c.message.split("\n").length <= 8);
  assert.equal(c.from, "이 름");
});
