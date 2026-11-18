// Reproducible pixel-art asset generation: `pnpm assets:generate`.
//  - PNGs        → public/assets/christmas/** (the folder is rebuilt from scratch)
//  - sprite meta → src/constants/sprites.json (sizes, building anchors, animation tables)
//  - OG image    → src/app/opengraph-image.png, favicon → src/app/icon.png
// Pass `--preview <dir>` to also write upscaled review sheets and full-map renders.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Px } from "./lib/px.ts";
import { C } from "./lib/palette.ts";
import * as bg from "./art/background.ts";
import * as D from "./art/decorations.ts";
import * as B from "./art/buildings.ts";
import { HOUSES, type HouseArt } from "./art/houses.ts";
import { christmasTree } from "./art/tree.ts";
import { ITEMS, WRAPS, giftBox, type WrapId } from "./art/gifts.ts";
import { SANTA, TEAM, santaSheet, teamSheet } from "./art/characters.ts";
import { paintGround } from "./art/terrain.ts";
import * as paper from "./art/stationery.ts";
import {
  BRIDGE,
  BUILDINGS,
  BUILDING_IDS,
  GROUND_Y,
  LAMPS,
  MOON,
  PROP_KINDS,
  SKY_LAYERS,
  SKY_TOP,
  SLEIGH_PARK,
  SPAWN,
  STRANDS,
  BULB_COLORS,
  TREE,
  WORLD,
  paintStrand,
  sizesOf,
  worldProps,
  type BuildingId,
} from "../src/game/world.ts";

const OUT = "public/assets/christmas";
const argPreview = process.argv.indexOf("--preview");
const previewDir = argPreview > 0 ? process.argv[argPreview + 1] : undefined;

rmSync(OUT, { recursive: true, force: true });
const assets = new Map<string, Px>();
function save(rel: string, px: Px): Px {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, px.png());
  assets.set(rel, px);
  return px;
}

// ---------------------------------------------------------------- sky + ground
save(SKY_LAYERS.sky.src, bg.sky());
save(SKY_LAYERS.stars.src, bg.stars());
save(SKY_LAYERS.mountains.src, bg.mountains());
save(SKY_LAYERS.forest.src, bg.forest());
save("backgrounds/moon.png", bg.moon());
save("world/ground.png", paintGround());

// ---------------------------------------------------------------- buildings
const ART: Record<BuildingId, () => HouseArt> = {
  ...HOUSES,
  workshop: B.workshop,
  chapel: B.chapel,
  "tea-house": B.teaHouse,
  "a-frame": B.aFrame,
  shed: B.shed,
  "blue-cottage": () => B.blueCottage(HOUSES["red-cottage"]),
  "rose-cottage": () => B.roseCottage(HOUSES["stone-cottage"]),
};
type Meta = {
  w: number;
  h: number;
  top: number;
  door: [number, number];
  gift: [number, number];
  smoke: [number, number] | null;
};
const buildings = {} as Record<BuildingId, Meta>;
for (const id of BUILDING_IDS) {
  const art = ART[id]();
  save(`buildings/${id}-base.png`, art.base);
  save(`buildings/${id}-lit.png`, art.lit);
  save(`buildings/${id}-decor.png`, art.decor);
  // first opaque row above the door column: where the marker hovers
  let top = 0;
  while (top < art.base.h && !art.base.alphaAt(art.door[0], top)) top++;
  buildings[id] = {
    w: art.base.w,
    h: art.base.h,
    top,
    door: art.door,
    gift: art.gift,
    smoke: art.smoke[0] < 0 ? null : art.smoke,
  };
}
const sizes = sizesOf(buildings);

// ---------------------------------------------------------------- tree + props
const tree = christmasTree();
save("trees/christmas-tree.png", tree.base);
save("trees/christmas-tree-lit.png", tree.lit);
save("trees/gift-pile.png", D.giftPile());
save("decorations/pine-large.png", D.pine("large", 3));
save("decorations/pine-small.png", D.pine("small", 4));
save("decorations/pine-tiny.png", D.pine("tiny", 5));
save("decorations/lamppost.png", D.lamppost(false));
save("decorations/lamppost-lit.png", D.lamppost(true));
save("decorations/snowman.png", D.snowman());
save("decorations/candy-cane.png", D.candyCane());
save("decorations/lantern-post.png", D.lanternPost());
save("decorations/xmas-tree.png", D.xmasTree());
save("decorations/fence.png", D.fence());
save("decorations/fence-side.png", B.fenceSide(36));
save("decorations/bench.png", B.bench());
save("decorations/signpost.png", B.signpost());
save("decorations/crates.png", B.crates());
const bridge = B.bridge();
save("world/bridge-deck.png", bridge.deck);
save("world/bridge-back.png", bridge.back);
save("world/bridge-front.png", bridge.front);

// ---------------------------------------------------------------- effects
save("effects/sparkle.png", D.sparkle(false));
save("effects/sparkle-large.png", D.sparkle(true));
save("effects/twinkle.png", D.twinkle());
save("effects/smoke.png", D.smoke());
save("effects/marker.png", D.marker());
save("effects/glow-warm.png", B.glow(24, C.gold3));
save("effects/glow-warm-large.png", B.glow(56, C.gold2));
save("effects/glow-red.png", B.glow(8, C.nose));
save("effects/shadow-santa.png", B.shadow(16, 5));
save("effects/shadow-sleigh.png", B.shadow(76, 11));
const steps = B.footprints();
save("effects/footprint-v.png", steps.v);
save("effects/footprint-h.png", steps.h);
save("effects/tap.png", B.tapRing());
const flake = new Px(2, 2);
flake.rect(0, 0, 2, 2, C.snow6);
save("effects/flake.png", flake);
const dot = new Px(1, 1);
dot.set(0, 0, C.snow6);
save("effects/dot.png", dot);
// a soft, nearer snowflake that drifts past the camera now and then
const big = new Px(3, 3);
big.map(0, 0, [".a.", "aba", ".a."], { a: C.snow4, b: C.snow6 });
save("effects/flake-large.png", big);

// ---------------------------------------------------------------- gifts + characters
for (const id of Object.keys(WRAPS) as WrapId[]) save(`gifts/box-${id}.png`, giftBox(id));
for (const [id, draw] of Object.entries(ITEMS)) save(`gifts/item-${id}.png`, draw());
save("decorations/gifts.png", D.giftStack([giftBox("crimson"), giftBox("pine"), giftBox("ivory")]));
save("ui/paper.png", paper.paperTile());
save("ui/holly.png", paper.holly());
save("ui/stamp.png", paper.stamp());
const santa = santaSheet();
save("characters/santa.png", santa.sheet);
const team = teamSheet();
save("characters/sleigh.png", team.sheet);

// ---------------------------------------------------------------- metadata
const spriteSizes: Record<string, [number, number]> = {};
for (const [rel, px] of assets) spriteSizes[rel] = [px.w, px.h];
writeFileSync(
  "src/constants/sprites.json",
  JSON.stringify(
    {
      sizes: spriteSizes,
      buildings,
      santa: { w: SANTA.w, h: SANTA.h, footY: SANTA.footY, anims: santa.anims },
      sleigh: {
        w: TEAM.w,
        h: TEAM.h,
        groundY: TEAM.groundY,
        nose: [TEAM.noseX, TEAM.noseY],
        anims: team.anims,
      },
    },
    null,
    2,
  ) + "\n",
);

// ---------------------------------------------------------------- composition
const props = worldProps(sizes);
const get = (rel: string) => {
  const p = assets.get(rel);
  if (!p) throw new Error(`missing asset ${rel}`);
  return p;
};

/** Paint the village into `out`; (ox, oy) is the world point drawn at out (0, 0). */
function compose(
  out: Px,
  ox: number,
  oy: number,
  lit: ReadonlySet<BuildingId>,
  treeLit: boolean,
  santaAt: readonly [number, number] = SPAWN,
) {
  const place = (rel: string, x: number, y: number, flipX = false) =>
    out.blit(get(rel), x - ox, y - oy, { flipX });
  out.rect(0, 0, out.w, out.h, SKY_TOP);
  for (const layer of Object.values(SKY_LAYERS)) {
    const p = get(layer.src);
    for (let x = -(((ox % p.w) + p.w) % p.w); x < out.w; x += p.w) out.blit(p, x, layer.y - oy);
  }
  place("backgrounds/moon.png", MOON[0], MOON[1]);
  place("world/ground.png", 0, GROUND_Y);
  place("world/bridge-deck.png", BRIDGE.x, BRIDGE.y);
  const items: Array<{ z: number; draw: () => void }> = [];
  for (const id of BUILDING_IDS) {
    const b = BUILDINGS[id];
    const m = buildings[id];
    const on = lit.has(id) || id === "workshop";
    items.push({
      z: b.y + b.block[1] + b.block[3],
      draw: () => {
        place(`buildings/${id}-base.png`, b.x, b.y);
        if (on) {
          place(`buildings/${id}-lit.png`, b.x, b.y);
          place(`buildings/${id}-decor.png`, b.x, b.y);
        }
        if (lit.has(id) && id !== "workshop")
          place("gifts/box-crimson.png", b.x + m.gift[0] - 5, b.y + m.gift[1] - 10);
      },
    });
  }
  items.push({
    z: TREE.y + TREE.block[1] + TREE.block[3],
    draw: () => {
      place("trees/christmas-tree.png", TREE.x, TREE.y);
      if (treeLit) {
        place("trees/christmas-tree-lit.png", TREE.x, TREE.y);
        place("trees/gift-pile.png", TREE.x + 16, TREE.y + 88);
      }
    },
  });
  for (const p of props) {
    const k = PROP_KINDS[p.kind];
    items.push({ z: p.y + k.h, draw: () => place(k.src, p.x, p.y, p.flip) });
  }
  for (const l of LAMPS)
    items.push({
      z: l.y + 30,
      draw: () =>
        place(
          treeLit || l.group === "always"
            ? "decorations/lamppost-lit.png"
            : "decorations/lamppost.png",
          l.x,
          l.y,
        ),
    });
  for (const s of STRANDS)
    items.push({
      z: s.z,
      draw: () => {
        const bulbs = paintStrand(s, (x, y, c) => out.set(x - ox, y - oy, c));
        if (s.kind === "lights" && (treeLit || s.group === "always"))
          bulbs.forEach(([x, y], i) => D.bulb(out, x - ox, y - oy, BULB_COLORS[i % 4]!));
      },
    });
  items.push({ z: BRIDGE.y + 9, draw: () => place("world/bridge-back.png", BRIDGE.x, BRIDGE.y) });
  items.push({ z: BRIDGE.y + 31, draw: () => place("world/bridge-front.png", BRIDGE.x, BRIDGE.y) });
  const sheetFrame = (sheet: Px, w: number, h: number, i: number, cols: number) =>
    sheet.crop((i % cols) * w, Math.floor(i / cols) * h, w, h);
  items.push({
    z: SLEIGH_PARK[1],
    draw: () =>
      out.blit(
        sheetFrame(team.sheet, TEAM.w, TEAM.h, team.anims["park-empty"]![0]!, 4),
        SLEIGH_PARK[0] - TEAM.w / 2 - ox,
        SLEIGH_PARK[1] - TEAM.groundY - oy,
      ),
  });
  items.push({
    z: santaAt[1],
    draw: () =>
      out.blit(
        sheetFrame(santa.sheet, SANTA.w, SANTA.h, santa.anims["idle-s-full"]![0]!, santa.cols),
        santaAt[0] - SANTA.w / 2 - ox,
        santaAt[1] - SANTA.footY - oy,
      ),
  });
  items.sort((a, b) => a.z - b.z).forEach((i) => i.draw());
}

const all = new Set(BUILDING_IDS);
// Open Graph image: 1200×630 = 400×210 art pixels at 3×, framed on the plaza
const og = new Px(400, 210);
compose(og, 312, 292, all, true, [560, 494]);
og.rect(0, 0, og.w, og.h, SKY_TOP, 0.2); // the night tint the game draws
writeFileSync("src/app/opengraph-image.png", og.scale(3).png());
// favicon: the golden star on night blue
const icon = new Px(32, 32);
icon.rect(0, 0, 32, 32, "#101827");
icon.blit(get("gifts/item-golden-star.png"), 4, 4);
writeFileSync("src/app/icon.png", icon.scale(2).png());

if (previewDir) {
  mkdirSync(previewDir, { recursive: true });
  for (const [name, set, done] of [
    ["map-initial", new Set<BuildingId>(), false],
    ["map-complete", all, true],
  ] as const) {
    const p = new Px(WORLD.w, WORLD.h);
    compose(p, 0, 0, set, done);
    writeFileSync(join(previewDir, `${name}.png`), p.scale(2).png());
  }
  const sheet = new Px(santa.sheet.w + 4, santa.sheet.h + team.sheet.h + 8);
  sheet.rect(0, 0, sheet.w, sheet.h, C.snow3);
  sheet.blit(santa.sheet, 2, 2);
  sheet.blit(team.sheet, 2, santa.sheet.h + 6);
  writeFileSync(join(previewDir, "characters.png"), sheet.scale(4).png());
  console.log("previews written to", previewDir);
}
console.log(`${assets.size} assets written to ${OUT}`);
