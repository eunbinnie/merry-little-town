// Reproducible pixel-art asset generation: `pnpm assets:generate`.
//  - PNGs        → public/assets/christmas/**
//  - sprite meta → src/constants/sprites.json (sizes + house anchors)
//  - OG image    → src/app/opengraph-image.png
// Pass `--preview <dir>` to also write upscaled review sheets and scene compositions.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Px } from "./lib/px.ts";
import * as bg from "./art/background.ts";
import * as D from "./art/decorations.ts";
import { HOUSES, type HouseArt } from "./art/houses.ts";
import { christmasTree } from "./art/tree.ts";
import { ITEMS, WRAPS, giftBox, type WrapId } from "./art/gifts.ts";
import {
  FOREGROUND,
  HOUSE_SPOTS,
  MOON,
  PROPS,
  SKY_TOP,
  SNOW_FIELD,
  TILES,
  TREE,
} from "../src/constants/scene.ts";

const OUT = "public/assets/christmas";
const argPreview = process.argv.indexOf("--preview");
const previewDir = argPreview > 0 ? process.argv[argPreview + 1] : undefined;

const assets = new Map<string, Px>();
function save(rel: string, px: Px): Px {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, px.png());
  assets.set(rel, px);
  return px;
}

// ---------------------------------------------------------------- backgrounds
save(TILES.sky.src, bg.sky());
save(TILES.stars.src, bg.stars());
save(TILES.mountains.src, bg.mountains());
save(TILES.forest.src, bg.forest());
save(TILES.ground.src, bg.ground());
save("backgrounds/moon.png", bg.moon());
save(FOREGROUND.src, bg.foregroundDrifts());

// ---------------------------------------------------------------- houses
type HouseId = keyof typeof HOUSES;
const houseMeta = {} as Record<
  HouseId,
  {
    w: number;
    h: number;
    top: number;
    door: [number, number];
    gift: [number, number];
    smoke: [number, number];
  }
>;
const houseArt = {} as Record<HouseId, HouseArt>;
for (const id of Object.keys(HOUSES) as HouseId[]) {
  const art = HOUSES[id]();
  houseArt[id] = art;
  save(`houses/${id}-base.png`, art.base);
  save(`houses/${id}-lit.png`, art.lit);
  save(`houses/${id}-decor.png`, art.decor);
  // first opaque row above the door column: where the selection marker hovers
  let top = 0;
  while (top < art.base.h && !art.base.alphaAt(art.door[0], top)) top++;
  houseMeta[id] = {
    w: art.base.w,
    h: art.base.h,
    top,
    door: art.door,
    gift: art.gift,
    smoke: art.smoke,
  };
}

// paths connect every door to the plaza around the tree
const door = (id: HouseId): [number, number] => [
  HOUSE_SPOTS[id].x + houseArt[id].door[0],
  HOUSE_SPOTS[id].y + houseArt[id].door[1] + 1,
];
const plaza = { cx: TREE.x + 33, cy: TREE.y + 103, rx: 40 };
type Pt = readonly [number, number];
const curves: Array<readonly [Pt, Pt, Pt]> = [
  [[126, 392], [124, 362], door("stone-cottage")],
  [[126, 360], [60, 352], door("red-cottage")],
  [[126, 360], [196, 352], door("bakery")],
  [door("red-cottage"), [72, 262], [plaza.cx - 34, plaza.cy + 2]],
  [door("bakery"), [186, 258], [plaza.cx + 34, plaza.cy + 2]],
  [[plaza.cx - 30, plaza.cy - 2], [62, 222], door("townhouse")],
  [[plaza.cx + 30, plaza.cy - 2], [196, 220], door("woodland-cabin")],
];
save(
  "backgrounds/village-paths.png",
  bg.villagePaths(curves, { cx: plaza.cx, cy: plaza.cy, rx: plaza.rx, ry: 0 }),
);

// ---------------------------------------------------------------- tree
const tree = christmasTree();
save("trees/christmas-tree.png", tree.base);
save("trees/christmas-tree-lit.png", tree.lit);
save("trees/gift-pile.png", D.giftPile());

// ---------------------------------------------------------------- decorations
save("decorations/pine-large.png", D.pine("large", 3));
save("decorations/pine-small.png", D.pine("small", 4));
save("decorations/pine-tiny.png", D.pine("tiny", 5));
save("decorations/lamppost.png", D.lamppost(false));
save("decorations/lamppost-lit.png", D.lamppost(true));
save("decorations/lantern.png", D.lantern(false));
save("decorations/lantern-lit.png", D.lantern(true));
save("decorations/wreath.png", D.wreath());
save("decorations/snowman.png", D.snowman());
save("decorations/candy-cane.png", D.candyCane());
save("decorations/fence.png", D.fence());
const sample = (w: number, h: number, draw: (p: Px) => void) => {
  const p = new Px(w, h);
  draw(p);
  return p;
};
save(
  "decorations/garland.png",
  sample(34, 8, (p) => D.garland(p, 1, 32, 2, 3, 9, { bows: true, bulbs: D.BULBS })),
);
save(
  "decorations/string-lights.png",
  sample(34, 8, (p) =>
    D.lightString(
      p,
      [
        [0, 2],
        [16, 5],
        [33, 2],
      ],
      D.BULBS,
      3,
      1,
    ),
  ),
);
save(
  "decorations/candle.png",
  sample(5, 8, (p) => D.candle(p, 1, 0)),
);
save("effects/snowflake.png", D.snowflake());
save("effects/sparkle.png", D.sparkle(false));
save("effects/sparkle-large.png", D.sparkle(true));
save("effects/twinkle.png", D.twinkle());
save("effects/smoke.png", D.smoke());
save("effects/marker.png", D.marker());

// ---------------------------------------------------------------- gifts
for (const id of Object.keys(WRAPS) as WrapId[]) {
  const box = giftBox(id);
  save(`gifts/box-${id}-body.png`, box.body);
  save(`gifts/box-${id}-lid.png`, box.lid);
  save(`gifts/box-${id}-small.png`, box.small);
}
for (const [id, draw] of Object.entries(ITEMS)) save(`gifts/item-${id}.png`, draw());

// ---------------------------------------------------------------- metadata
const sizes: Record<string, [number, number]> = {};
for (const [rel, px] of assets) sizes[rel] = [px.w, px.h];
writeFileSync(
  "src/constants/sprites.json",
  JSON.stringify({ sizes, houses: houseMeta, plaza }, null, 2) + "\n",
);

// ---------------------------------------------------------------- composition
/** Paint the village into `out`; (ox, oy) is where core (0,0) lands. */
function compose(
  out: Px,
  ox: number,
  oy: number,
  delivered: ReadonlySet<HouseId>,
  complete: boolean,
): void {
  const get = (rel: string) => assets.get(rel)!;
  const tile = (rel: string, y: number) => {
    const p = get(rel);
    for (let x = (((ox % p.w) + p.w) % p.w) - p.w; x < out.w; x += p.w) out.blit(p, x, oy + y);
  };
  out.rect(0, 0, out.w, out.h, SKY_TOP);
  tile(TILES.sky.src, TILES.sky.y);
  tile(TILES.stars.src, TILES.stars.y);
  out.blit(get("backgrounds/moon.png"), ox + MOON.x, oy + MOON.y);
  tile(TILES.mountains.src, TILES.mountains.y);
  tile(TILES.forest.src, TILES.forest.y);
  out.rect(0, oy + TILES.ground.y + TILES.ground.h, out.w, out.h, SNOW_FIELD);
  tile(TILES.ground.src, TILES.ground.y);
  out.blit(get("backgrounds/village-paths.png"), ox, oy);
  const items: Array<{ z: number; draw: () => void }> = [];
  for (const id of Object.keys(HOUSE_SPOTS) as HouseId[]) {
    const s = HOUSE_SPOTS[id];
    const m = houseMeta[id];
    items.push({
      z: s.y + m.h,
      draw: () => {
        out.blit(get(`houses/${id}-base.png`), ox + s.x, oy + s.y);
        if (delivered.has(id)) {
          out.blit(get(`houses/${id}-lit.png`), ox + s.x, oy + s.y);
          out.blit(get(`houses/${id}-decor.png`), ox + s.x, oy + s.y);
          const g = get("gifts/box-crimson-small.png");
          out.blit(g, ox + s.x + m.gift[0] - 5, oy + s.y + m.gift[1] - g.h);
        }
      },
    });
  }
  const t = get("trees/christmas-tree.png");
  items.push({
    z: TREE.y + t.h,
    draw: () => {
      out.blit(t, ox + TREE.x, oy + TREE.y);
      if (complete) {
        out.blit(get("trees/christmas-tree-lit.png"), ox + TREE.x, oy + TREE.y);
        out.blit(get("trees/gift-pile.png"), ox + TREE.x + 16, oy + TREE.y + 88);
      }
    },
  });
  for (const p of PROPS)
    items.push({
      z: p.z,
      draw: () => out.blit(get(complete && p.litSrc ? p.litSrc : p.src), ox + p.x, oy + p.y),
    });
  items.sort((a, b) => a.z - b.z).forEach((i) => i.draw());
  tile(FOREGROUND.src, FOREGROUND.y);
}

const all = new Set(Object.keys(HOUSE_SPOTS) as HouseId[]);
// Open Graph image: 1200×630 = 400×210 art pixels at 3×, framed on the tree and houses
const og = new Px(400, 210);
compose(og, 72, -110, all, true);
writeFileSync("src/app/opengraph-image.png", og.scale(3).png());
// favicon: the golden star on night blue
const icon = new Px(32, 32);
icon.rect(0, 0, 32, 32, "#101827");
icon.blit(assets.get("gifts/item-golden-star.png")!, 4, 4);
writeFileSync("src/app/icon.png", icon.scale(2).png());

if (previewDir) {
  mkdirSync(previewDir, { recursive: true });
  const states: Array<[string, Set<HouseId>, boolean]> = [
    ["scene-initial", new Set(), false],
    ["scene-partial", new Set<HouseId>(["red-cottage", "townhouse"]), false],
    ["scene-complete", all, true],
  ];
  for (const [name, set, done] of states) {
    const p = new Px(320, 440);
    compose(p, 32, 20, set, done);
    writeFileSync(join(previewDir, `${name}.png`), p.scale(3).png());
  }
  // gifts sheet
  const sheet = new Px(8 * 28, 3 * 44);
  sheet.rect(0, 0, sheet.w, sheet.h, "#1d2b42");
  Object.keys(ITEMS).forEach((id, i) =>
    sheet.blit(assets.get(`gifts/item-${id}.png`)!, i * 28 + 2, 2),
  );
  (Object.keys(WRAPS) as WrapId[]).forEach((id, i) => {
    sheet.blit(assets.get(`gifts/box-${id}-body.png`)!, i * 44, 30);
    sheet.blit(assets.get(`gifts/box-${id}-lid.png`)!, i * 44, 30);
    sheet.blit(
      assets.get(`gifts/box-${id}-small.png`)!,
      180 + (i % 2) * 14,
      34 + Math.floor(i / 2) * 14,
    );
  });
  sheet.blit(assets.get("trees/gift-pile.png")!, 180, 66);
  [
    "decorations/wreath.png",
    "decorations/snowman.png",
    "decorations/candy-cane.png",
    "decorations/lamppost-lit.png",
    "effects/sparkle-large.png",
    "effects/snowflake.png",
    "effects/smoke.png",
    "decorations/garland.png",
  ].forEach((rel, i) => sheet.blit(assets.get(rel)!, 2 + i * 26, 82 + (i % 2) * 18));
  writeFileSync(join(previewDir, "sheet.png"), sheet.scale(4).png());
  console.log("previews written to", previewDir);
}
console.log(`${assets.size} assets written to ${OUT}`);
