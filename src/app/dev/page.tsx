import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SPRITE_SIZES } from "@/constants/sprites";
import { ASSET_ROOT } from "@/game/world";

// Development-only visual review of every generated sprite. Full-map renders
// come from `pnpm assets:generate --preview <dir>`.
export const metadata: Metadata = { title: "Asset preview", robots: { index: false } };

export default function DevPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className="fixed inset-0 overflow-auto bg-midnight p-6 font-sans text-ivory">
      <h1 className="mb-4 text-xl font-bold">Sprites ({Object.keys(SPRITE_SIZES).length})</h1>
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
