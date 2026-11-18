import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GIFT_IDS,
  HOUSE_IDS,
  INITIAL_STATE,
  SACK_SIZE,
  isComplete,
  parseState,
  reduce,
  type Action,
  type VillageState,
} from "../src/features/village/game.ts";

const run = (s: VillageState, ...actions: Action[]) => actions.reduce(reduce, s);
const load = (r = 0): Action => ({ type: "load", random: Array(8).fill(r) });
const started = () => run(INITIAL_STATE, { type: "start" });

test("nothing can be loaded before the sleigh has landed", () => {
  assert.equal(reduce(INITIAL_STATE, load()), INITIAL_STATE);
  assert.equal(started().started, true);
});

test("loading fills the sack with distinct gifts, up to its size", () => {
  const s = run(started(), load(0.5));
  assert.equal(s.sack.length, SACK_SIZE);
  assert.equal(new Set(s.sack.map((g) => g.giftId)).size, SACK_SIZE);
  assert.equal(reduce(s, load(0.1)), s, "a full sack stays as it is");
});

test("a house can't be served without a gift, nor served twice", () => {
  assert.equal(reduce(started(), { type: "deliver", houseId: "bakery" }).deliveries.length, 0);
  let s = run(started(), load(), { type: "deliver", houseId: "bakery" });
  assert.equal(s.deliveries.length, 1);
  assert.equal(s.sack.length, SACK_SIZE - 1);
  const again = reduce(s, { type: "deliver", houseId: "bakery" });
  assert.equal(again, s);
  s = reduce(s, { type: "deliver", houseId: "a-frame" });
  assert.equal(s.deliveries[1]?.houseId, "a-frame");
});

test("serving every house completes the village with all-different gifts", () => {
  let s = started();
  for (const [i, id] of HOUSE_IDS.entries()) {
    assert.equal(isComplete(s), false);
    if (s.sack.length === 0) s = reduce(s, load(i / HOUSE_IDS.length));
    s = reduce(s, { type: "deliver", houseId: id });
  }
  assert.equal(isComplete(s), true);
  assert.equal(new Set(s.deliveries.map((d) => d.giftId)).size, HOUSE_IDS.length);
  assert.ok(s.deliveries.every((d) => GIFT_IDS.includes(d.giftId)));
  assert.equal(reduce(s, load()), s, "no more gifts once complete");
});

test("the last trip only loads what is still needed", () => {
  let s = started();
  for (const id of HOUSE_IDS.slice(0, 6)) {
    if (s.sack.length === 0) s = reduce(s, load());
    s = reduce(s, { type: "deliver", houseId: id });
  }
  assert.equal(run(s, load()).sack.length, 1);
});

test("reset keeps the sleigh landed but clears progress", () => {
  const s = reduce(run(started(), load(), { type: "deliver", houseId: "townhouse" }), {
    type: "reset",
  });
  assert.deepEqual(s, { ...INITIAL_STATE, started: true });
});

test("stored state round-trips and corrupted data is rejected", () => {
  const s = run(
    started(),
    load(0.3),
    { type: "deliver", houseId: "red-cottage" },
    { type: "rest", pos: [120, 340] },
  );
  assert.deepEqual(parseState(JSON.parse(JSON.stringify(s))), s);

  assert.equal(parseState(null), null);
  assert.equal(parseState("nope"), null);
  assert.equal(parseState({ ...s, version: 3 }), null);
  assert.equal(parseState({ ...s, started: "yes" }), null);
  assert.equal(parseState({ ...s, pos: [1, "x"] }), null);
  assert.equal(parseState({ ...s, sack: [...s.sack, ...s.sack] }), null, "sack too full");
  assert.equal(
    parseState({ ...s, sack: [{ giftId: s.deliveries[0]!.giftId, wrapId: "pine" }] }),
    null,
    "a delivered gift can't be in the sack too",
  );
  assert.equal(
    parseState({ ...s, deliveries: [...s.deliveries, s.deliveries[0]] }),
    null,
    "duplicate house",
  );
  assert.equal(
    parseState({ ...s, deliveries: [{ houseId: "castle", giftId: "scarf", wrapId: "pine" }] }),
    null,
  );
});

test("version 1 saves are migrated", () => {
  const v1 = {
    version: 1,
    phase: "selecting",
    currentGift: { giftId: "scarf", wrapId: "pine", opened: true },
    deliveries: [{ houseId: "bakery", giftId: "stocking", wrapId: "ivory" }],
  };
  assert.deepEqual(parseState(v1), {
    version: 2,
    started: true,
    sack: [{ giftId: "scarf", wrapId: "pine" }],
    deliveries: [{ houseId: "bakery", giftId: "stocking", wrapId: "ivory" }],
    pos: null,
  });
  assert.equal(parseState({ ...v1, phase: "landing", currentGift: null })?.started, false);
  assert.equal(parseState({ ...v1, currentGift: { giftId: "pony" } }), null);
});
