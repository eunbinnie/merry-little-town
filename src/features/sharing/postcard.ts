// 9:16 Christmas card built from a 1:1 render of the village around Santa
// (180×320 art pixels, scaled 6× to 1080×1920), framed with a greeting.
import { COPY } from "@/constants/copy";
import { ASSET_ROOT } from "@/game/world";
import type { Delivery } from "@/features/village/game";

const W = 1080;
const H = 1920;
const S = 6;

const images = new Map<string, Promise<HTMLImageElement>>();
export function load(rel: string): Promise<HTMLImageElement> {
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

export function fontFamily(variable: string, fallback: string): string {
  const v = getComputedStyle(document.body).getPropertyValue(variable).trim();
  return v || fallback;
}

/** Stepped (pixel-row) darkening so the text stays legible over any scene. */
export function band(
  ctx: CanvasRenderingContext2D,
  fromY: number,
  rows: number,
  down: boolean,
  max: number,
) {
  for (let i = 0; i < rows; i++) {
    const t = 1 - i / rows;
    ctx.fillStyle = `rgba(10,16,29,${(max * t ** 1.4).toFixed(3)})`;
    ctx.fillRect(0, fromY + (down ? i : -i - 1) * S, W, S);
  }
}

export async function composePostcard(
  photo: HTMLImageElement,
  chill: number,
  deliveries: readonly Delivery[],
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = false;

  const serif = fontFamily("--font-gowun", "serif");
  const pixel = fontFamily("--font-pixelify", "monospace");
  const fontsReady = Promise.all([
    document.fonts.load(`600 96px ${pixel}`, COPY.postcard.greeting),
    document.fonts.load(`700 42px ${serif}`, COPY.postcard.message),
    document.fonts.load(`400 28px ${serif}`, COPY.postcard.brand),
  ]).catch(() => undefined);
  const [spark, ...items] = await Promise.all([
    load("effects/sparkle-large.png"),
    ...deliveries.map((d) => load(`gifts/item-${d.giftId}.png`)),
  ]);

  ctx.drawImage(photo, 0, 0, W, H);
  ctx.fillStyle = `rgba(10,16,29,${(chill * 0.7).toFixed(3)})`;
  ctx.fillRect(0, 0, W, H);
  band(ctx, 0, 46, true, 0.82);
  band(ctx, H, 58, false, 0.86);

  // frame
  ctx.fillStyle = "rgba(247,241,229,0.85)";
  for (const [x, y, w, h] of [
    [9, 9, 162, 1],
    [9, 310, 162, 1],
    [9, 9, 1, 302],
    [170, 9, 1, 302],
  ] as const)
    ctx.fillRect(x * S, y * S, w * S, h * S);

  await fontsReady;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 96px ${pixel}`;
  ctx.fillStyle = "#0a101d";
  ctx.fillText(COPY.postcard.greeting, W / 2, 196 + 6);
  ctx.fillStyle = "#f4cf83";
  ctx.fillText(COPY.postcard.greeting, W / 2, 196);
  if (spark) {
    ctx.drawImage(spark, 92, 96, spark.width * S, spark.height * S);
    ctx.drawImage(spark, W - 92 - spark.width * S, 170, spark.width * S, spark.height * S);
  }

  // the gifts Santa delivered tonight
  const size = 24 * 3;
  const gap = 12;
  const rowW = items.length * size + Math.max(0, items.length - 1) * gap;
  items.forEach((img, i) => {
    if (img) ctx.drawImage(img, W / 2 - rowW / 2 + i * (size + gap), H - 330, size, size);
  });

  ctx.font = `700 42px ${serif}`;
  ctx.fillStyle = "#f7f1e5";
  ctx.fillText(COPY.postcard.message, W / 2, H - 182);
  ctx.font = `400 28px ${serif}`;
  ctx.fillStyle = "rgba(247,241,229,0.7)";
  ctx.fillText(COPY.postcard.brand, W / 2, H - 120);

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

export async function copyLink(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(window.location.origin + "/");
    return true;
  } catch {
    return false;
  }
}

export type ShareResult = "shared" | "cancelled" | "unsupported" | "failed";

export const canShareFiles = (): boolean =>
  typeof navigator !== "undefined" &&
  Boolean(
    navigator.canShare?.({ files: [new File([""], POSTCARD_FILENAME, { type: "image/png" })] }),
  );

/**
 * Hand the PNG to the system share sheet (KakaoTalk, Messages, Instagram…).
 * Cancelling is a normal outcome; nothing is reported as shared unless it was.
 */
export async function shareImage(blob: Blob, name = POSTCARD_FILENAME): Promise<ShareResult> {
  const file = new File([blob], name, { type: "image/png" });
  if (!navigator.canShare?.({ files: [file] })) return "unsupported";
  try {
    await navigator.share({ files: [file], title: COPY.photo.shareTitle });
    return "shared";
  } catch (e) {
    return e instanceof DOMException && e.name === "AbortError" ? "cancelled" : "failed";
  }
}
