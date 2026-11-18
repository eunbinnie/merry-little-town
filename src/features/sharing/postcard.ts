// 9:16 Christmas card rendered from the same sprites and layout as the live
// scene, on its own canvas — never a screenshot of the page.
import { HOUSE_META, spriteSize } from "@/constants/sprites";
import { COPY } from "@/constants/copy";
import {
  ASSET_ROOT,
  FOREGROUND,
  HOUSE_SPOTS,
  MOON,
  PROPS,
  SKY_TOP,
  SNOW_FIELD,
  TILES,
  TREE,
} from "@/constants/scene";
import { HOUSE_IDS, type Delivery } from "@/features/village/game";

const W = 1080;
const H = 1920;
const S = 4; // one art pixel = 4×4 card pixels → 270×480 art pixels
const OX = 7; // core origin inside the card, in art pixels
const OY = 36;

const images = new Map<string, Promise<HTMLImageElement>>();
function load(rel: string): Promise<HTMLImageElement> {
  let p = images.get(rel);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${rel}`));
      img.src = `${ASSET_ROOT}/${rel}`;
    });
    images.set(rel, p);
  }
  return p;
}

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function fontFamily(variable: string, fallback: string): string {
  const v = getComputedStyle(document.body).getPropertyValue(variable).trim();
  return v || fallback;
}

export async function renderPostcard(deliveries: readonly Delivery[]): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = false;

  const serif = fontFamily("--font-gowun", "serif");
  const pixel = fontFamily("--font-pixelify", "monospace");
  const fontsReady = Promise.all([
    document.fonts.load(`400 92px ${pixel}`, COPY.postcard.greeting),
    document.fonts.load(`700 44px ${serif}`, COPY.postcard.message),
    document.fonts.load(`400 28px ${serif}`, COPY.postcard.brand),
  ]).catch(() => undefined);

  const at = async (rel: string, x: number, y: number) => {
    const img = await load(rel);
    ctx.drawImage(img, (OX + x) * S, (OY + y) * S, img.width * S, img.height * S);
    return img;
  };
  const tile = async (t: { src: string; y: number; w: number }) => {
    const img = await load(t.src);
    for (let x = OX - Math.ceil(OX / t.w) * t.w; x < W / S; x += t.w)
      ctx.drawImage(img, x * S, (OY + t.y) * S, img.width * S, img.height * S);
  };
  const glow = (cx: number, cy: number, r: number, a: number) => {
    const x = (OX + cx) * S;
    const y = (OY + cy) * S;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * S);
    grad.addColorStop(0, `rgba(244,207,131,${a})`);
    grad.addColorStop(0.6, `rgba(244,207,131,${a * 0.3})`);
    grad.addColorStop(1, "rgba(244,207,131,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r * S, y - r * S, r * 2 * S, r * 2 * S);
  };

  // preload everything up front so drawing order stays simple
  const rels = [
    ...Object.values(TILES).map((t) => t.src),
    FOREGROUND.src,
    "backgrounds/moon.png",
    "backgrounds/village-paths.png",
    "trees/christmas-tree.png",
    "trees/christmas-tree-lit.png",
    "trees/gift-pile.png",
    "effects/sparkle-large.png",
    ...HOUSE_IDS.flatMap((id) => [
      `houses/${id}-base.png`,
      `houses/${id}-lit.png`,
      `houses/${id}-decor.png`,
    ]),
    ...deliveries.map((d) => `gifts/box-${d.wrapId}-small.png`),
    ...PROPS.map((p) => p.litSrc ?? p.src),
  ];
  await Promise.all(rels.map(load));

  // sky, landscape, paths
  ctx.fillStyle = SKY_TOP;
  ctx.fillRect(0, 0, W, H);
  await tile(TILES.sky);
  await tile(TILES.stars);
  await at("backgrounds/moon.png", MOON.x, MOON.y);
  await tile(TILES.mountains);
  await tile(TILES.forest);
  ctx.fillStyle = SNOW_FIELD;
  ctx.fillRect(0, (OY + TILES.ground.y + TILES.ground.h) * S, W, H);
  await tile(TILES.ground);
  await at("backgrounds/village-paths.png", 0, 0);

  // depth-sorted village, fully lit
  const treeSize = spriteSize("trees/christmas-tree.png");
  type Draw = { z: number; draw: () => Promise<void> };
  const list: Draw[] = [];
  for (const id of HOUSE_IDS) {
    const s = HOUSE_SPOTS[id];
    const m = HOUSE_META[id];
    const d = deliveries.find((x) => x.houseId === id);
    list.push({
      z: s.y + m.h,
      draw: async () => {
        await at(`houses/${id}-base.png`, s.x, s.y);
        ctx.shadowColor = "rgba(244,207,131,0.6)";
        ctx.shadowBlur = 3 * S;
        await at(`houses/${id}-lit.png`, s.x, s.y);
        ctx.shadowBlur = 0;
        await at(`houses/${id}-decor.png`, s.x, s.y);
        if (d)
          await at(`gifts/box-${d.wrapId}-small.png`, s.x + m.gift[0] - 5, s.y + m.gift[1] - 10);
      },
    });
  }
  list.push({
    z: TREE.y + treeSize[1],
    draw: async () => {
      glow(TREE.x + 33, TREE.y + 52, 70, 0.32);
      await at("trees/christmas-tree.png", TREE.x, TREE.y);
      ctx.shadowColor = "rgba(255,217,138,0.75)";
      ctx.shadowBlur = 2 * S;
      await at("trees/christmas-tree-lit.png", TREE.x, TREE.y);
      ctx.shadowBlur = 0;
      await at("trees/gift-pile.png", TREE.x + 16, TREE.y + 88);
      glow(TREE.x + 33, TREE.y + 8, 12, 0.7);
    },
  });
  for (const p of PROPS)
    list.push({
      z: p.z,
      draw: async () => {
        await at(p.litSrc ?? p.src, p.x, p.y);
        if (p.litSrc) glow(p.x + 4.5, p.y + 6, 16, 0.4);
      },
    });
  list.sort((a, b) => a.z - b.z);
  for (const item of list) await item.draw();
  await tile(FOREGROUND);

  // snowfall, snapped to the art grid
  const rnd = seeded(1225);
  for (let i = 0; i < 170; i++) {
    const big = rnd() < 0.25;
    ctx.fillStyle = big ? "#f7f9fc" : "rgba(232,237,243,0.75)";
    const x = Math.floor(rnd() * (W / S)) * S;
    const y = Math.floor(rnd() * (H / S) * 0.9) * S;
    ctx.fillRect(x, y, big ? S * 2 : S, big ? S * 2 : S);
  }

  // frame
  ctx.strokeStyle = "rgba(247,241,229,0.85)";
  ctx.lineWidth = S;
  ctx.strokeRect(9 * S, 9 * S, W - 18 * S, H - 18 * S);
  ctx.strokeStyle = "rgba(247,241,229,0.35)";
  ctx.strokeRect(11 * S, 11 * S, W - 22 * S, H - 22 * S);

  // greeting
  await fontsReady;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `400 92px ${pixel}`;
  ctx.fillStyle = "#0a101d";
  ctx.fillText(COPY.postcard.greeting, W / 2, 180 + 6);
  ctx.fillStyle = "#f4cf83";
  ctx.fillText(COPY.postcard.greeting, W / 2, 180);
  const spark = await load("effects/sparkle-large.png");
  ctx.drawImage(spark, 96, 92, spark.width * S, spark.height * S);
  ctx.drawImage(spark, W - 96 - spark.width * S, 150, spark.width * S, spark.height * S);

  ctx.font = `700 44px ${serif}`;
  ctx.fillStyle = "#1d2b42";
  ctx.fillText(COPY.postcard.message, W / 2, H - 150);
  ctx.font = `400 28px ${serif}`;
  ctx.fillStyle = "#4e6389";
  ctx.fillText(COPY.postcard.brand, W / 2, H - 96);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))), "image/png"),
  );
}

export const POSTCARD_FILENAME = "christmas-village.png";

export function downloadBlob(blob: Blob, name = POSTCARD_FILENAME): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share the card as a file when the platform allows it; otherwise save the
 * image and copy the app link so the user can still pass it on.
 */
export async function sharePostcard(blob: Blob): Promise<"shared" | "cancelled" | "fallback"> {
  const url = window.location.origin + "/";
  const file = new File([blob], POSTCARD_FILENAME, { type: "image/png" });
  const text = `${COPY.complete.shareText}\n${url}`;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: COPY.complete.shareTitle, text });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // NotAllowedError etc. → fall through to the fallback
    }
  }
  downloadBlob(blob);
  await copyText(url);
  return "fallback";
}
