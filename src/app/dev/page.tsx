import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SPRITE_SIZES } from "@/constants/sprites";
import { ASSET_ROOT } from "@/constants/scene";
import { HOUSE_IDS, type Delivery } from "@/features/village/game";
import { VillageScene } from "@/components/village/VillageScene";

// Development-only visual review: every generated sprite plus the village in
// its initial, partial and completed states.
export const metadata: Metadata = { title: "Asset preview", robots: { index: false } };

const partial: Delivery[] = [
  { houseId: "red-cottage", giftId: "teddy-bear", wrapId: "crimson" },
  { houseId: "townhouse", giftId: "scarf", wrapId: "pine" },
];
const full: Delivery[] = HOUSE_IDS.map((houseId, i) => ({
  houseId,
  giftId: (["teddy-bear", "scarf", "snow-globe", "gingerbread", "golden-star"] as const)[i]!,
  wrapId: (["crimson", "pine", "ivory", "midnight", "crimson"] as const)[i]!,
}));

const frames = [
  { title: "Initial", deliveries: [] as Delivery[], lit: false },
  { title: "Partial (2/5)", deliveries: partial, lit: false },
  { title: "Complete", deliveries: full, lit: true },
];

export default function DevPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className="fixed inset-0 overflow-auto bg-midnight p-6 font-sans text-ivory">
      <h1 className="mb-4 text-xl font-bold">Village states</h1>
      <div className="flex flex-wrap gap-6">
        {frames.map((f) => (
          <figure key={f.title}>
            <figcaption className="mb-2 text-sm text-ivory/70">{f.title}</figcaption>
            <div
              className="stage"
              style={
                {
                  position: "relative",
                  width: 384,
                  height: 600,
                  "--stage-w": "384px",
                  "--stage-h": "600px",
                  "--ui-top": "0px",
                  "--ui-bottom": "0px",
                  "--px": "1.5px",
                } as React.CSSProperties
              }
            >
              <VillageScene deliveries={f.deliveries} treeLit={f.lit} />
            </div>
          </figure>
        ))}
      </div>

      <h1 className="mt-10 mb-4 text-xl font-bold">Sprites ({Object.keys(SPRITE_SIZES).length})</h1>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        {Object.entries(SPRITE_SIZES).map(([rel, [w, h]]) => (
          <figure key={rel} className="flex flex-col items-center gap-2 bg-deep p-3">
            <div className="flex h-[120px] items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${ASSET_ROOT}/${rel}`}
                alt={rel}
                className="pixel"
                style={{
                  width: w * Math.max(1, Math.min(3, Math.floor(110 / Math.max(w, h)))),
                  maxWidth: "100%",
                }}
              />
            </div>
            <figcaption className="text-center text-[11px] break-all text-ivory/70">
              {rel} · {w}×{h}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
