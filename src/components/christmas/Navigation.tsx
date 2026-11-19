"use client";

import { useEffect, useRef, useState } from "react";
import { BUILDING_NAMES, COPY } from "@/constants/copy";
import { BUILDING_META } from "@/constants/sprites";
import { HOUSE_IDS, type HouseId } from "@/features/village/game";
import {
  ASSET_ROOT,
  BUILDINGS,
  BUILDING_IDS,
  GROUND_Y,
  PLAZA,
  PROP_KINDS,
  SLEIGH_PARK,
  TREE,
  WORLD,
  ellipseValue,
  isWater,
  roadDistance,
  sizesOf,
  worldProps,
  type Pt,
} from "@/game/world";
import type { Destination } from "@/game/types";
import { PixelIcon } from "./PixelIcon";

const ICONS = {
  map: ["xx..xx..x", "x.xx..xxx", "x.x.x.x.x", "x.x.x.x.x", "x.x.x.x.x", "xxx..xx.x", "x..xx..xx"],
  plus: ["...x...", "...x...", "...x...", "xxxxxxx", "...x...", "...x...", "...x..."],
  minus: [".......", ".......", ".......", "xxxxxxx", ".......", ".......", "......."],
  target: ["...x...", ".xxxxx.", ".x...x.", "xx.x.xx", ".x...x.", ".xxxxx.", "...x..."],
  mouse: ["..xxx..", ".x.x.x.", ".x.x.x.", ".xxxxx.", ".x...x.", ".x...x.", ".x...x.", "..xxx.."],
  hand: ["..x.x.x..", "..x.x.x.x", "x.x.x.x.x", "xxxxxxx.x", "x.......x", ".x.....x.", "..xxxxx.."],
  check: [".......x", "......xx", "x....xx.", "xx..xx..", ".xxxx...", "..xx...."],
} as const;

const asset = (rel: string) => `${ASSET_ROOT}/${rel}`;

// ---------------------------------------------------------------- side controls

/** A compact column on the right: map, zoom in/out, back to Santa. */
export function NavControls(p: {
  disabled: boolean;
  onMap: () => void;
  onZoom: (dir: 1 | -1) => void;
  onRecenter: () => void;
}) {
  const btn = (label: string, icon: readonly string[], onClick: () => void) => (
    <button
      type="button"
      className="pixel-btn"
      data-variant="ghost"
      data-size="sm"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={p.disabled}
    >
      <PixelIcon rows={icon} />
    </button>
  );
  return (
    <div className="pointer-events-auto absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-20 flex flex-col gap-2">
      {btn(COPY.nav.map, ICONS.map, p.onMap)}
      {btn(COPY.nav.zoomIn, ICONS.plus, () => p.onZoom(1))}
      {btn(COPY.nav.zoomOut, ICONS.minus, () => p.onZoom(-1))}
      {btn(COPY.nav.recenter, ICONS.target, p.onRecenter)}
    </div>
  );
}

// ---------------------------------------------------------------- one-time guide

export function ControlsGuide({ onClose }: { onClose: () => void }) {
  const col = (icon: readonly string[], title: string, body: string) => (
    <div className="flex flex-1 flex-col items-center gap-1 text-center">
      <span className="text-glow">
        <PixelIcon rows={icon} scale={3} />
      </span>
      <p className="mt-1 text-sm font-bold text-ivory">{title}</p>
      <p className="text-xs text-ivory/70">{body}</p>
    </div>
  );
  return (
    <section
      className="plate fade-in pointer-events-auto absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-30 mx-auto max-w-sm px-4 pt-3 pb-4"
      aria-labelledby="guide-title"
    >
      <div className="flex items-center justify-between">
        <h2 id="guide-title" className="text-sm font-bold text-glow">
          {COPY.nav.guideTitle}
        </h2>
        <button
          type="button"
          className="-mr-2 grid size-10 place-items-center text-lg text-ivory/70 hover:text-ivory"
          aria-label={COPY.nav.close}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="mt-1 flex gap-3">
        {col(ICONS.mouse, COPY.nav.guidePc, COPY.nav.guidePcBody)}
        {col(ICONS.hand, COPY.nav.guideMobile, COPY.nav.guideMobileBody)}
      </div>
      <p className="mt-3 text-center text-xs text-ivory/60">{COPY.nav.guideFoot}</p>
    </section>
  );
}

// ---------------------------------------------------------------- the village map

const S = 4; // world pixels per map pixel
/** The map starts at the forest edge: the sky above holds nothing to find. */
const TOP = GROUND_Y + 34; // (WORLD.h - TOP) divides by S
const MW = WORLD.w / S;
const MH = Math.floor((WORLD.h - TOP) / S);
let paintedMap: string | null = null;

/** The village drawn small from the world data itself: snow lanes on a night-blue field. */
function paintMap(): string {
  if (paintedMap) return paintedMap;
  const c = document.createElement("canvas");
  c.width = MW;
  c.height = MH;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(MW, MH);
  const put = (i: number, hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    img.data.set([n >> 16, (n >> 8) & 255, n & 255, 255], i * 4);
  };
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++) {
      const p: Pt = [x * S + S / 2, TOP + y * S + S / 2];
      const i = y * MW + x;
      if (isWater(p)) put(i, "#2c4a78");
      else if (ellipseValue(p, PLAZA) < 1) put(i, "#7d88a3");
      else if (roadDistance(p) < 0) put(i, "#d9e2f0");
      else put(i, (x + y) % 2 ? "#18233d" : "#1b2744");
    }
  ctx.putImageData(img, 0, 0);
  ctx.translate(0, -TOP / S); // shapes below are placed in world coordinates / S
  const sizes = sizesOf(BUILDING_META);
  ctx.fillStyle = "#24493f";
  for (const pr of worldProps(sizes)) {
    if (!pr.kind.startsWith("pine")) continue;
    const k = PROP_KINDS[pr.kind];
    ctx.fillRect(Math.round((pr.x + k.w / 2) / S) - 1, Math.round((pr.y + k.h) / S) - 3, 2, 3);
  }
  const houses = new Set<string>(HOUSE_IDS);
  for (const id of BUILDING_IDS) {
    const b = BUILDINGS[id];
    const m = BUILDING_META[id];
    const x0 = Math.round(b.x / S) + 1;
    const w = Math.max(5, Math.round(m.w / S) - 2);
    const yb = Math.round((b.y + m.h) / S);
    const h = Math.max(4, Math.round((m.h * 0.45) / S));
    ctx.fillStyle = houses.has(id) ? "#6b4a3a" : "#4a5068";
    ctx.fillRect(x0, yb - h, w, h);
    ctx.fillStyle = houses.has(id) ? "#b94b4b" : "#7b86a3";
    for (let r = 0; r < Math.ceil(w / 2); r++) ctx.fillRect(x0 + r, yb - h - r, w - 2 * r, 1);
    ctx.fillStyle = "#f4cf83";
    ctx.fillRect(x0 + Math.floor(w / 2), yb - Math.ceil(h / 2), 1, 1);
  }
  // the plaza tree with its star, and the sleigh
  const tx = Math.round((TREE.x + 33) / S);
  const ty = Math.round((TREE.y + 90) / S);
  ctx.fillStyle = "#3c6654";
  for (let r = 0; r < 9; r++)
    ctx.fillRect(tx - Math.floor(r / 2), ty - 18 + r * 2, Math.floor(r / 2) * 2 + 1, 2);
  ctx.fillStyle = "#f4cf83";
  ctx.fillRect(tx - 1, ty - 20, 3, 2);
  ctx.fillStyle = "#b94b4b";
  ctx.fillRect(Math.round(SLEIGH_PARK[0] / S) - 5, Math.round(SLEIGH_PARK[1] / S) - 3, 8, 3);
  ctx.fillStyle = "#8a5a3a";
  ctx.fillRect(Math.round(SLEIGH_PARK[0] / S) + 4, Math.round(SLEIGH_PARK[1] / S) - 4, 6, 2);
  paintedMap = c.toDataURL();
  return paintedMap;
}

type Spot = { dest: Destination; at: Pt; name: string; house?: HouseId };
const SPOTS: Spot[] = [
  ...HOUSE_IDS.map((id) => {
    const b = BUILDINGS[id];
    const m = BUILDING_META[id];
    return {
      dest: id,
      house: id,
      name: BUILDING_NAMES[id],
      at: [b.x + m.w / 2, b.y + m.h * 0.55] as Pt,
    };
  }),
  { dest: "sleigh", name: COPY.hud.sleigh, at: [SLEIGH_PARK[0], SLEIGH_PARK[1] - 10] },
  { dest: "tree", name: COPY.toast.tree, at: [TREE.x + 33, TREE.y + 40] },
];
const pct = ([x, y]: Pt) => ({
  left: `${(x / WORLD.w) * 100}%`,
  top: `${((y - TOP) / (WORLD.h - TOP)) * 100}%`,
});

export function VillageMap(p: {
  delivered: ReadonlySet<HouseId>;
  santa: Pt;
  onGo: (dest: Destination) => void;
  onClose: () => void;
}) {
  const [src] = useState(paintMap); // only ever mounted in the browser, after a tap
  const [picked, setPicked] = useState<Spot | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { onClose } = p;
  useEffect(() => {
    closeRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const status = (s: Spot) =>
    s.house
      ? p.delivered.has(s.house)
        ? COPY.nav.delivered
        : COPY.nav.awaiting
      : s.dest === "sleigh"
        ? COPY.nav.sleigh
        : COPY.nav.tree;

  return (
    <div
      className="village-map fixed inset-0 z-40 flex items-center justify-center bg-[rgb(10_16_29/0.72)] p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-title"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="plate flex max-h-full w-full max-w-xl flex-col gap-2 overflow-auto p-3">
        <div className="flex items-center justify-between">
          <h2 id="map-title" className="text-sm font-bold text-glow">
            {COPY.nav.map}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="-mr-1 grid size-10 place-items-center text-lg text-ivory/70 hover:text-ivory"
            aria-label={COPY.nav.close}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="relative w-full" style={{ aspectRatio: `${WORLD.w} / ${WORLD.h - TOP}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="pixel absolute inset-0 size-full" draggable={false} />
          {SPOTS.map((s) => {
            const done = s.house ? p.delivered.has(s.house) : false;
            const sel = picked?.dest === s.dest;
            return (
              <button
                key={s.dest}
                type="button"
                className="map-spot"
                data-state={s.house ? (done ? "done" : "waiting") : "place"}
                data-selected={sel || undefined}
                style={pct(s.at)}
                aria-label={`${s.name}, ${status(s)}`}
                aria-pressed={sel}
                onClick={() => setPicked(s)}
              >
                {s.house && !done && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset("gifts/box-crimson.png")}
                    alt=""
                    width={22}
                    height={20}
                    className="pixel"
                  />
                )}
                {done && <PixelIcon rows={ICONS.check} />}
                {!s.house && (
                  <span className="text-[10px] leading-none font-bold">{s.name.slice(-2)}</span>
                )}
              </button>
            );
          })}
          <span className="map-santa" style={pct(p.santa)} role="img" aria-label={COPY.nav.santa}>
            <span>{COPY.nav.santa}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ivory/70">
          <span className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("gifts/box-crimson.png")}
              alt=""
              width={14}
              height={13}
              className="pixel"
            />
            {COPY.nav.legendAwaiting}
          </span>
          <span className="flex items-center gap-1.5 text-glow">
            <PixelIcon rows={ICONS.check} />
            <span className="text-ivory/70">{COPY.nav.legendDone}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full border-2 border-ivory bg-berry" />
            {COPY.nav.santa}
          </span>
        </div>
        <div className="flex min-h-14 items-center gap-3 px-1" aria-live="polite">
          {picked ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ivory">{picked.name}</p>
                <p className="text-xs text-ivory/70">{status(picked)}</p>
              </div>
              <button
                type="button"
                className="pixel-btn shrink-0"
                data-size="sm"
                onClick={() => p.onGo(picked.dest)}
              >
                {COPY.nav.go}
              </button>
            </>
          ) : (
            <p className="w-full text-center text-sm text-ivory/70">{COPY.nav.pick}</p>
          )}
        </div>
      </div>
    </div>
  );
}
