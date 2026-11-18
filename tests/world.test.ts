import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BUILDING_IDS,
  SLEIGH_PICKUP,
  SPAWN,
  doorStand,
  isWater,
  obstacles,
  sizesOf,
  worldProps,
  type BuildingId,
  type BuildingMeta,
  type Pt,
} from "../src/game/world.ts";
import { Grid } from "../src/game/grid.ts";
import { HOUSE_IDS } from "../src/features/village/game.ts";

const meta = JSON.parse(readFileSync("src/constants/sprites.json", "utf8")).buildings as Record<
  BuildingId,
  BuildingMeta
>;
const sizes = sizesOf(meta);
const grid = new Grid(obstacles(sizes, worldProps(sizes)));

const ends = (path: Pt[] | null, target: Pt) => {
  assert.ok(path, "a route exists");
  const last = path[path.length - 1]!;
  return Math.hypot(last[0] - target[0], last[1] - target[1]);
};

test("Santa starts on walkable snow next to the sleigh", () => {
  assert.ok(grid.walkable(...SPAWN));
  assert.ok(ends(grid.path(SPAWN, SLEIGH_PICKUP), SLEIGH_PICKUP) < 3);
});

test("every door can be reached on foot from the sleigh", () => {
  for (const id of BUILDING_IDS) {
    const stand = doorStand(id, meta[id]);
    assert.ok(grid.walkable(...stand), `${id} doorstep is walkable`);
    assert.ok(ends(grid.path(SLEIGH_PICKUP, stand), stand) < 3, `${id} is reachable`);
  }
  assert.ok(
    HOUSE_IDS.every((id) => BUILDING_IDS.includes(id)),
    "gift houses exist on the map",
  );
});

test("routes never cross the frozen water; the bridge is the way east", () => {
  const cabin = doorStand("woodland-cabin", meta["woodland-cabin"]);
  const path = grid.path([300, 460], cabin)!;
  let prev: Pt = [300, 460];
  for (const p of path) {
    for (let t = 0; t <= 1; t += 0.02) {
      const q: Pt = [prev[0] + (p[0] - prev[0]) * t, prev[1] + (p[1] - prev[1]) * t];
      assert.ok(!isWater(q), `walks on water at ${q.map(Math.round)}`);
    }
    prev = p;
  }
});

test("tapping a building or water snaps to the closest walkable spot", () => {
  const inPond: Pt = [806, 718];
  const end = grid.nearest(...inPond)!;
  assert.ok(grid.walkable(...end));
  assert.ok(grid.path(SPAWN, [100, 100]), "tapping the sky walks to the forest edge");
});

test("pathfinding across the whole map is fast", () => {
  const t0 = performance.now();
  for (let i = 0; i < 10; i++) grid.path([40, 860], [960, 240]);
  assert.ok((performance.now() - t0) / 10 < 40);
});
