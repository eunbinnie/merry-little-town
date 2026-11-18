"use client";

import { memo, type ImgHTMLAttributes } from "react";
import { HOUSE_META, spriteSize } from "@/constants/sprites";
import {
  ASSET_ROOT,
  FOREGROUND,
  HOUSE_SPOTS,
  MOON,
  PROPS,
  SNOW_FIELD,
  TILES,
  TREE,
  TWINKLES,
} from "@/constants/scene";
import { GIFTS, HOUSE_NAMES } from "@/constants/copy";
import { HOUSE_IDS, type Delivery, type HouseId } from "@/features/village/game";

export { HOUSE_META };

/** Length of `n` art pixels. */
export const u = (n: number) => `calc(var(--px) * ${n})`;
export const asset = (rel: string) => `${ASSET_ROOT}/${rel}`;

type SpriteProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  x?: number;
  y?: number;
  "data-on"?: boolean;
};

export function Sprite({ src, x = 0, y = 0, className = "", style, ...rest }: SpriteProps) {
  const size = spriteSize(src);
  return (
    // Plain <img>: tiny static pixel sprites need nearest-neighbour scaling, not optimisation.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(src)}
      alt=""
      draggable={false}
      decoding="async"
      className={`pixel absolute ${className}`}
      style={{ left: u(x), top: u(y), width: u(size[0]), height: u(size[1]), ...style }}
      {...rest}
    />
  );
}

function Tile({ tile, z }: { tile: { src: string; y: number; w: number; h: number }; z?: number }) {
  // spans far beyond the core so wide screens see more landscape, never a stretched one
  return (
    <div
      className="tile"
      style={{
        left: u(-768),
        width: u(1792),
        top: u(tile.y),
        height: u(tile.h),
        backgroundImage: `url(${asset(tile.src)})`,
        backgroundSize: `${u(tile.w)} ${u(tile.h)}`,
        backgroundPosition: `${u(768 % tile.w)} 0`,
        zIndex: z,
      }}
    />
  );
}

const TREE_SIZE = spriteSize("trees/christmas-tree.png");

type Item = { z: number } & (
  { kind: "house"; id: HouseId } | { kind: "tree" } | { kind: "prop"; i: number }
);
const ITEMS: Item[] = [
  ...HOUSE_IDS.map((id): Item => ({ kind: "house", id, z: HOUSE_SPOTS[id].y + HOUSE_META[id].h })),
  { kind: "tree", z: TREE.y + TREE_SIZE[1] } as Item,
  ...PROPS.map((p, i): Item => ({ kind: "prop", i, z: p.z })),
].sort((a, b) => a.z - b.z);

const BURST = [
  [0.15, 0.35, 0],
  [0.82, 0.22, 0.12],
  [0.5, 0.05, 0.25],
  [0.12, 0.72, 0.35],
  [0.88, 0.66, 0.45],
  [0.48, 0.5, 0.55],
] as const;

const CELEBRATION = [
  [128, 118, 0],
  [104, 150, 0.3],
  [154, 160, 0.5],
  [92, 196, 0.8],
  [166, 204, 1.0],
  [40, 92, 1.2],
  [222, 128, 1.4],
  [30, 196, 1.6],
  [232, 188, 1.75],
  [126, 262, 1.9],
  [60, 250, 2.1],
  [200, 250, 2.3],
] as const;

type HouseProps = {
  id: HouseId;
  delivery: Delivery | undefined;
  selectable: boolean;
  selected: boolean;
  sparkle: boolean;
  z: number;
  onSelect?: (id: HouseId) => void;
};

function House({ id, delivery, selectable, selected, sparkle, z, onSelect }: HouseProps) {
  const m = HOUSE_META[id];
  const spot = HOUSE_SPOTS[id];
  const on = Boolean(delivery);
  const canPick = selectable && !on;
  const label = delivery
    ? `${HOUSE_NAMES[id]} — ${GIFTS[delivery.giftId].name} 배달 완료`
    : HOUSE_NAMES[id];
  return (
    <button
      type="button"
      className="house"
      data-house={id}
      disabled={!canPick}
      aria-pressed={canPick ? selected : undefined}
      aria-label={label}
      onClick={() => onSelect?.(id)}
      style={{ left: u(spot.x), top: u(spot.y), width: u(m.w), height: u(m.h), zIndex: z }}
    >
      <Sprite src={`houses/${id}-base.png`} />
      <Sprite src={`houses/${id}-lit.png`} className="lit-layer" data-on={on} />
      <Sprite src={`houses/${id}-decor.png`} className="decor-layer" data-on={on} />
      {delivery && (
        <Sprite
          src={`gifts/box-${delivery.wrapId}-small.png`}
          x={m.gift[0] - 5}
          y={m.gift[1] - 10}
          className="doorstep-gift"
        />
      )}
      {on &&
        [0, 1.4, 2.8].map((d) => (
          <Sprite
            key={d}
            src="effects/smoke.png"
            x={m.smoke[0] - 4}
            y={m.smoke[1] - 6}
            className="smoke"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
      {canPick && (
        <Sprite src="effects/marker.png" x={m.door[0] - 4} y={m.top - 9} className="marker" />
      )}
      {sparkle &&
        BURST.map(([fx, fy, d], i) => (
          <Sprite
            key={i}
            src={i % 2 ? "effects/sparkle.png" : "effects/sparkle-large.png"}
            x={fx * m.w - 4}
            y={fy * m.h - 4}
            className="sparkle"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
    </button>
  );
}

export type VillageSceneProps = {
  deliveries: readonly Delivery[];
  treeLit: boolean;
  selectable?: boolean;
  selected?: HouseId | null;
  onSelect?: (id: HouseId) => void;
  sparkle?: HouseId | null;
  celebrate?: boolean;
};

export const VillageScene = memo(function VillageScene({
  deliveries,
  treeLit,
  selectable = false,
  selected = null,
  onSelect,
  sparkle = null,
  celebrate = false,
}: VillageSceneProps) {
  return (
    <div className="core" role="group" aria-label="크리스마스 마을">
      <div
        className="absolute"
        style={{
          left: u(-768),
          width: u(1792),
          top: u(400),
          height: u(800),
          background: SNOW_FIELD,
        }}
      />
      <Tile tile={TILES.sky} />
      <Tile tile={TILES.stars} />
      {TWINKLES.map((t, i) => (
        <Sprite
          key={i}
          src="effects/twinkle.png"
          x={t.x}
          y={t.y}
          className="twinkle"
          style={{ animationDelay: `${(i * 0.73) % 3.2}s` }}
        />
      ))}
      <Sprite src="backgrounds/moon.png" x={MOON.x} y={MOON.y} />
      <Tile tile={TILES.mountains} />
      <Tile tile={TILES.forest} />
      <Tile tile={TILES.ground} />
      <Sprite src="backgrounds/village-paths.png" />

      {ITEMS.map((item) => {
        if (item.kind === "house") {
          return (
            <House
              key={item.id}
              id={item.id}
              z={item.z}
              delivery={deliveries.find((d) => d.houseId === item.id)}
              selectable={selectable}
              selected={selected === item.id}
              sparkle={sparkle === item.id}
              onSelect={onSelect}
            />
          );
        }
        if (item.kind === "tree") {
          return (
            <div
              key="tree"
              className="absolute"
              style={{
                left: u(TREE.x),
                top: u(TREE.y),
                width: u(TREE_SIZE[0]),
                height: u(TREE_SIZE[1]),
                zIndex: item.z,
              }}
            >
              <div
                className="glow"
                data-on={treeLit}
                style={{ left: u(-46), top: u(-10), width: u(158), height: u(126) }}
              />
              <Sprite src="trees/christmas-tree.png" />
              <Sprite src="trees/christmas-tree-lit.png" className="tree-lit" data-on={treeLit} />
              {treeLit && (
                <Sprite src="trees/gift-pile.png" x={16} y={88} className="doorstep-gift" />
              )}
              <div
                className="glow star-glow"
                data-on={treeLit}
                style={{ left: u(19), top: u(-6), width: u(28), height: u(28) }}
              />
            </div>
          );
        }
        const p = PROPS[item.i]!;
        if (!p.litSrc)
          return <Sprite key={item.i} src={p.src} x={p.x} y={p.y} style={{ zIndex: p.z }} />;
        return (
          <div key={item.i} className="contents">
            <Sprite src={p.src} x={p.x} y={p.y} style={{ zIndex: p.z }} />
            <Sprite
              src={p.litSrc}
              x={p.x}
              y={p.y}
              className="crossfade"
              style={{ zIndex: p.z, opacity: treeLit ? 1 : 0 }}
            />
            <div
              className="glow"
              data-on={treeLit}
              style={{
                left: u(p.x - 14),
                top: u(p.y - 12),
                width: u(37),
                height: u(34),
                zIndex: p.z,
              }}
            />
          </div>
        );
      })}

      <Tile tile={FOREGROUND} z={400} />
      {celebrate &&
        CELEBRATION.map(([x, y, d], i) => (
          <Sprite
            key={i}
            src={i % 3 ? "effects/sparkle.png" : "effects/sparkle-large.png"}
            x={x}
            y={y}
            className="sparkle"
            style={{ zIndex: 500, animationDelay: `${d}s`, animationIterationCount: 2 }}
          />
        ))}
    </div>
  );
});
