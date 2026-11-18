// Client-only entry: imported dynamically so Phaser never runs during SSR.
import * as Phaser from "phaser";
import { SKY_TOP } from "./world";
import { VillageScene } from "./VillageScene";
import type { GameEvent, GameHandle } from "./types";

export function createGame(parent: HTMLElement, emit: (e: GameEvent) => void): GameHandle {
  const scene = new VillageScene(emit);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: SKY_TOP,
    pixelArt: true,
    roundPixels: true,
    banner: false,
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
    },
    // keyboard is handled by the scene (so HUD buttons keep Space/Enter)
    input: { keyboard: false },
    scene,
  });
  return {
    skipIntro: () => scene.skipIntro(),
    goTo: (target) => scene.goTo(target),
    capture: () => scene.capture(),
    leaveHouse: () => scene.leaveHouse(),
    endCard: () => scene.endCard(),
    destroy: () => game.destroy(true),
  };
}
