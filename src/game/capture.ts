// Render a world rectangle at 1:1 art pixels into an offscreen texture —
// gameplay overlays (markers, tap ring, arrow) are left out.
import * as Phaser from "phaser";

export const UI_FLAG = "ui";

export function snapshotRegion(
  scene: Phaser.Scene,
  [left, top, w, h]: readonly [number, number, number, number],
): Promise<HTMLImageElement> {
  const key = "__photo";
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addDynamicTexture(key, w, h);
  if (!tex) return Promise.reject(new Error("Dynamic textures unavailable"));
  const cam = scene.cameras.main;
  scene.children.depthSort();
  tex.beginDraw();
  for (const go of scene.children.getChildren()) {
    const o = go as Phaser.GameObjects.Image;
    if (o.getData?.(UI_FLAG) || !o.willRender(cam) || o.scrollFactorX === 0) continue;
    tex.batchDraw(o, o.x - left, o.y - top);
  }
  tex.endDraw();
  return new Promise((resolve, reject) => {
    tex.snapshot((img) => {
      scene.textures.remove(key);
      if (img instanceof HTMLImageElement) resolve(img);
      else reject(new Error("Snapshot failed"));
    });
  });
}
