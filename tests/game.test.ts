import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GIFT_IDS,
  HOUSE_IDS,
  INITIAL_STATE,
  isComplete,
  parseState,
  reduce,
  type Action,
  type VillageState,
} from "../src/features/village/game.ts";

const run = (s: VillageState, ...actions: Action[]) => actions.reduce(reduce, s);
const draw = (r = 0): Action => ({ type: "drawGift", random: r, wrapRandom: r });

function deliverTo(s: VillageState, houseId: (typeof HOUSE_IDS)[number], r = 0): VillageState {
  return run(
    s,
    draw(r),
    { type: "openGift" },
    { type: "chooseHouse" },
    { type: "deliver", houseId },
  );
}

test("start leaves the landing screen", () => {
  assert.equal(run(INITIAL_STATE, { type: "start" }).phase, "village");
});

test("a drawn gift must be opened before choosing a house", () => {
  let s = run(INITIAL_STATE, { type: "start" }, draw(0.5));
  assert.equal(s.phase, "opening");
  assert.equal(s.currentGift?.opened, false);
  assert.equal(reduce(s, { type: "chooseHouse" }), s, "cannot skip opening");
  s = run(s, { type: "openGift" }, { type: "chooseHouse" });
  assert.equal(s.phase, "selecting");
});

test("drawing again does not reroll the current gift", () => {
  const s = run(INITIAL_STATE, { type: "start" }, draw(0.1));
  assert.equal(reduce(s, draw(0.9)), s);
});

test("a delivered house cannot receive a second gift", () => {
  let s = deliverTo(run(INITIAL_STATE, { type: "start" }), "bakery");
  s = run(s, draw(), { type: "openGift" }, { type: "chooseHouse" });
  const again = reduce(s, { type: "deliver", houseId: "bakery" });
  assert.equal(again, s);
  assert.equal(s.deliveries.length, 1);
});

test("five deliveries complete the village with five different gifts", () => {
  let s = run(INITIAL_STATE, { type: "start" });
  for (const [i, id] of HOUSE_IDS.entries()) {
    assert.equal(isComplete(s), false);
    s = deliverTo(s, id, i / 5);
  }
  assert.equal(s.phase, "complete");
  assert.equal(isComplete(s), true);
  assert.equal(new Set(s.deliveries.map((d) => d.giftId)).size, 5);
  assert.ok(s.deliveries.every((d) => GIFT_IDS.includes(d.giftId)));
  assert.equal(reduce(s, draw()), s, "no more gifts once complete");
});

test("reset clears progress", () => {
  const s = reduce(deliverTo(run(INITIAL_STATE, { type: "start" }), "townhouse"), {
    type: "reset",
  });
  assert.deepEqual(s.deliveries, []);
  assert.equal(s.currentGift, null);
  assert.equal(s.phase, "village");
});

test("stored state round-trips and corrupted data is rejected", () => {
  const s = run(deliverTo(run(INITIAL_STATE, { type: "start" }), "red-cottage"), draw(0.3), {
    type: "openGift",
  });
  assert.deepEqual(parseState(JSON.parse(JSON.stringify(s))), s);

  assert.equal(parseState(null), null);
  assert.equal(parseState("nope"), null);
  assert.equal(parseState({ ...s, version: 2 }), null);
  assert.equal(parseState({ ...s, phase: "dancing" }), null);
  assert.equal(parseState({ ...s, currentGift: null }), null, "opening needs a gift");
  assert.equal(
    parseState({ ...s, phase: "selecting", currentGift: { ...s.currentGift!, opened: false } }),
    null,
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
  assert.equal(
    parseState({ ...INITIAL_STATE, phase: "complete" }),
    null,
    "complete needs five deliveries",
  );
});
