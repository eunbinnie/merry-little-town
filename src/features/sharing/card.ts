// The personalised Christmas postcard (1080×1920, 9:16): the served house
// rendered 1:1 and scaled 6×, gentle snowfall, and a handwritten paper card
// laid over the snow below the doorstep, so the door and the gift stay visible.
import { COPY } from "@/constants/copy";
import { POSTCARD } from "@/game/world";
import type { SceneShot } from "@/game/types";
import type { GiftId } from "@/features/village/game";
import { band, fontFamily, load } from "./postcard";
import { wrapText } from "./text";

export type CardText = { to: string; message: string; from: string };

const W = 1080;
const H = 1920;
const S = 6;
const INK = "#4b382a";
const RED = "#9d403e";
const PAPER = "#f5e8ca";
export const BRAND = "Merry Little Town";

// The paper rests on the bottom edge and grows upwards with the message, but
// never above the postcard's card line, so the doorstep and gift stay visible.
const PAPER_X = 78;
const PAPER_W = 924;
const PAPER_BOTTOM = H - 70;
const PAPER_MIN_Y = POSTCARD.cardTop * S + 6;
const HEAD = 244; // greeting + "To." line
const FOOT = 122; // gift + signature

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** Largest font size (in steps of 2px) at which the message fits the lines available. */
function fitMessage(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  width: number,
  height: number,
): { size: number; lineH: number; lines: string[] } {
  for (let size = 56; size >= 32; size -= 2) {
    ctx.font = font(size);
    const lineH = Math.round(size * 1.34);
    const lines = wrapText(text, width, (s) => ctx.measureText(s).width);
    if (lines.length * lineH <= height) return { size, lineH, lines };
  }
  // the editor's limits make this unreachable, but never draw outside the paper
  ctx.font = font(32);
  const lineH = 43;
  const max = Math.floor(height / lineH);
  const lines = wrapText(text, width, (s) => ctx.measureText(s).width).slice(0, max);
  lines[max - 1] = `${lines[max - 1] ?? ""}…`;
  return { size: 32, lineH, lines };
}

/** Shrink a single line (name) until it fits. */
function fitLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (s: number) => string,
  from: number,
  width: number,
) {
  let size = from;
  ctx.font = font(size);
  while (size > 30 && ctx.measureText(text).width > width) ctx.font = font((size -= 2));
  return size;
}

export async function composeCard(shot: SceneShot, card: CardText, giftId: GiftId): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const hand = fontFamily("--font-pen", "cursive");
  const serif = fontFamily("--font-gowun", "serif");
  const pixel = fontFamily("--font-pixelify", "monospace");
  const handFont = (size: number) => `400 ${size}px ${hand}`;
  // fetch exactly the glyphs (unicode-range chunks) this card needs before drawing
  const fonts = Promise.all([
    document.fonts.load(handFont(64), COPY.card.greeting + card.to + card.message + card.from),
    document.fonts.load(`700 32px ${serif}`, COPY.card.to + COPY.card.from),
    document.fonts.load(`400 26px ${pixel}`, BRAND),
  ]).catch(() => undefined);
  const [paperTile, holly, stamp, item] = await Promise.all([
    load("ui/paper.png"),
    load("ui/holly.png"),
    load("ui/stamp.png"),
    load(`gifts/item-${giftId}.png`),
  ]);

  // ---- the village scene, crisp pixels
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(shot.image, 0, 0, W, H);
  ctx.fillStyle = `rgba(10,16,29,${(shot.chill * 0.75).toFixed(3)})`;
  ctx.fillRect(0, 0, W, H);
  band(ctx, 0, 34, true, 0.5); // the night deepens towards the top edge

  // gentle snowfall over the scene, snapped to the art grid
  const rnd = seeded(1225);
  for (let i = 0; i < 120; i++) {
    const big = rnd() < 0.22;
    const x = Math.floor(rnd() * (W / S)) * S;
    const y = Math.floor(rnd() * (PAPER_BOTTOM / S)) * S;
    ctx.fillStyle = big
      ? "rgba(247,249,252,0.9)"
      : `rgba(232,237,243,${(0.45 + rnd() * 0.4).toFixed(2)})`;
    ctx.fillRect(x, y, big ? S * 2 : S, big ? S * 2 : S);
  }

  await fonts;

  const lx = PAPER_X + 92;
  const rx = PAPER_X + PAPER_W - 92;
  const msg = fitMessage(
    ctx,
    card.message.trim(),
    handFont,
    rx - lx,
    PAPER_BOTTOM - PAPER_MIN_Y - HEAD - FOOT,
  );
  const msgH = Math.max(2, msg.lines.length) * msg.lineH + 8;
  const P = { x: PAPER_X, w: PAPER_W, h: HEAD + msgH + FOOT, y: 0 };
  P.y = PAPER_BOTTOM - P.h;

  // ---- the paper card, tilted a touch as if just laid down
  const cx = P.x + P.w / 2;
  const cy = P.y + P.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.012);
  ctx.translate(-cx, -cy);

  ctx.save();
  ctx.shadowColor = "rgba(6,10,20,0.55)";
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = PAPER;
  ctx.fillRect(P.x, P.y, P.w, P.h);
  ctx.restore();

  // pixel paper grain, anchored to the card
  const grain = document.createElement("canvas");
  grain.width = paperTile.width * 3;
  grain.height = paperTile.height * 3;
  const gctx = grain.getContext("2d")!;
  gctx.imageSmoothingEnabled = false;
  gctx.drawImage(paperTile, 0, 0, grain.width, grain.height);
  ctx.save();
  ctx.translate(P.x, P.y);
  ctx.fillStyle = ctx.createPattern(grain, "repeat")!;
  ctx.fillRect(0, 0, P.w, P.h);
  ctx.restore();

  // softly aged edges and a thin antique-gold rule
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(200,175,131,${(0.34 - i * 0.055).toFixed(3)})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(P.x + 3 + i * 6, P.y + 3 + i * 6, P.w - 6 - i * 12, P.h - 6 - i * 12);
  }
  ctx.strokeStyle = "rgba(195,160,101,0.8)";
  ctx.lineWidth = 3;
  ctx.strokeRect(P.x + 28, P.y + 28, P.w - 56, P.h - 56);
  ctx.strokeStyle = "rgba(195,160,101,0.4)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(P.x + 36, P.y + 36, P.w - 72, P.h - 72);

  // washi tape holding the card
  ctx.save();
  ctx.translate(cx, P.y + 2);
  ctx.rotate(0.045);
  ctx.beginPath();
  ctx.rect(-118, -24, 236, 48);
  ctx.clip();
  ctx.fillStyle = "rgba(157,64,62,0.84)";
  ctx.fillRect(-118, -24, 236, 48);
  ctx.strokeStyle = "rgba(247,241,229,0.32)";
  ctx.lineWidth = 7;
  for (let x = -140; x < 140; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x + 40, -30);
    ctx.stroke();
  }
  ctx.restore();

  // holly + postage stamp (pixel accents, same art as the village)
  ctx.drawImage(holly, P.x + 52, P.y + 52, holly.width * 4, holly.height * 4);
  ctx.save();
  ctx.translate(P.x + P.w - 106, P.y + 98);
  ctx.rotate(0.06);
  ctx.drawImage(stamp, -44, -52, stamp.width * 4, stamp.height * 4);
  ctx.strokeStyle = "rgba(75,56,42,0.33)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(-46, 30, 34, 0, Math.PI * 2);
  ctx.stroke();
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    for (let t = 0; t <= 60; t += 4) ctx.lineTo(-108 + t, 18 + k * 12 + Math.sin(t / 6) * 3);
    ctx.stroke();
  }
  ctx.restore();

  // ---- writing
  ctx.fillStyle = RED;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = handFont(66);
  ctx.fillText(COPY.card.greeting, cx, P.y + 118);

  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `700 32px ${serif}`;
  ctx.fillText(COPY.card.to, lx, P.y + 204);
  const nameX = lx + 64;
  fitLine(ctx, card.to, handFont, 62, rx - nameX);
  ctx.fillText(card.to, nameX, P.y + 206);
  ctx.strokeStyle = "rgba(75,56,42,0.32)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(nameX - 4, P.y + 222);
  ctx.lineTo(rx, P.y + 222);
  ctx.stroke();
  ctx.setLineDash([]);

  const top = P.y + HEAD;
  const bottom = top + msgH;
  ctx.strokeStyle = "rgba(75,56,42,0.12)";
  ctx.lineWidth = 2;
  for (let y = top + msg.lineH; y <= bottom; y += msg.lineH) {
    ctx.beginPath();
    ctx.moveTo(lx, y - msg.lineH * 0.16);
    ctx.lineTo(rx, y - msg.lineH * 0.16);
    ctx.stroke();
  }
  ctx.font = handFont(msg.size);
  ctx.fillStyle = INK;
  msg.lines.forEach((line, i) =>
    ctx.fillText(line, lx, top + msg.lineH * (i + 1) - msg.lineH * 0.3),
  );

  // the gift that was left on the doorstep, and the (optional) signature
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(item, lx - 6, P.y + P.h - 118, item.width * 3, item.height * 3);
  const from = card.from.trim();
  if (from) {
    ctx.textAlign = "right";
    const size = fitLine(ctx, from, handFont, 52, rx - lx - 240);
    ctx.font = handFont(size);
    const w = ctx.measureText(from).width;
    ctx.fillText(from, rx, P.y + P.h - 58);
    ctx.font = `700 28px ${serif}`;
    ctx.fillText(COPY.card.from, rx - w - 14, P.y + P.h - 60);
  }
  ctx.restore();

  // quiet signature of the village
  ctx.textAlign = "center";
  ctx.font = `400 26px ${pixel}`;
  ctx.fillStyle = "rgba(247,241,229,0.6)";
  ctx.fillText(BRAND, W / 2, H - 24);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))), "image/png"),
  );
}
