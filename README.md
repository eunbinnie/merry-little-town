# christmas-village

크리스마스가 도착하는 마을: a small explorable Christmas Eve village where you play as Santa. Rudolph lands the sleigh by the gift workshop. You walk the snowy streets, load wrapped presents from the sleigh and place them on doorsteps. Every gift lights up another house, and each delivery can become a handwritten Christmas card for a real person. You write "To." and a message, Santa slips away from the doorstep, and you get a 9:16 postcard of that house to send. After the last gift the big tree on the plaza glows, and the village stays open to wander.

Everything runs in the browser. There is no backend, database or login, and progress is kept in LocalStorage.

## Commands

Requires Node ≥ 22.18. The asset script and the tests run TypeScript natively, without a build step. `.nvmrc` pins Node 26.

```bash
pnpm install
pnpm dev               # http://localhost:3000
pnpm build && pnpm start
pnpm lint              # ESLint
pnpm typecheck         # tsc --noEmit (strict)
pnpm test              # node:test: game rules, save migration, map walkability, card text
pnpm format            # Prettier (format:check in CI)
pnpm assets:generate   # regenerate every sprite, the ground, the OG image and the favicon
```

`pnpm assets:generate --preview <dir>` also writes full-map renders and a character sheet. During development, `/dev` lists every generated sprite; in production builds that page returns a 404.

## How to play

| Input                     | What it does                                                                 |
| ------------------------- | ---------------------------------------------------------------------------- |
| Tap / click the snow      | Santa walks there (A\* around buildings, trees, fences and the frozen water) |
| Tap a house, sleigh, tree | Santa walks to it and acts: load gifts, place a gift, or look around         |
| Arrow keys / WASD         | Walk directly                                                                |
| Space / Enter             | Act on whatever Santa is standing next to                                    |
| Hidden "바로 가기" list   | Tab into it for keyboard and screen-reader access to every destination       |

- **Gifts.** The sack holds three wrapped gifts. At the sleigh they pop out of the cargo, open, and drop into the sack. All seven houses get a different gift.
- **Deliveries.** Six houses get a doorstep delivery: Santa puts the gift down, the windows light up and the decorations appear. The townhouse door is snowed in, so Rudolph flies Santa up to the chimney, and the present stays visible sticking out of the chimney top.
- **Village changes as you go.** Street lamps and plaza lights turn on as houses are served, and the night tint eases.
- **Finale.** After the last gift, the camera visits the tree, the neighbours wake up and Rudolph does a lap. You can keep exploring afterwards.
- **Christmas card.**
  - Right after a delivery, sparkles settle on the gift and the camera frames the house. A small paper note opens with "To.", a message, and an optional "From.".
  - "카드 완성하기" makes Santa walk quietly away, leaving footprints in the snow, and the postcard of that exact house is rendered.
  - From the preview you can share, save, edit the letter, or go back to the village. Editing reuses the rendered scene, so it never repeats the delivery.
  - "나중에 쓸게요" skips the card. Tapping a served house later opens its card again.
- **Photo.** "사진" renders the area around Santa at 1:1, with markers and the tap ring left out, framed as a simple 1080×1920 card.

### The postcard

- **Scene.** Each house has a fixed 180×320 art-pixel frame (`postcardFrame` in `world.ts`). It is rendered offscreen at 1:1 and scaled 6× to 1080×1920. The door line is pinned at row 158, and the paper is laid from row 194 down, so it never covers the entrance or the gift. Tests check this for every house.
- **Paper.** The card is drawn on the canvas, not screenshotted:
  - cream stock with the generated pixel grain, aged edges and a thin antique-gold rule
  - washi tape, holly, and a postage stamp showing a lit cottage
  - the delivered gift as a small sticker
  - a faint "Merry Little Town" under the card

  The paper's height follows the message, so short notes leave more of the village showing.

- **Lettering.** Nanum Pen Script (SIL Open Font License 1.1) for the handwriting, Gowun Batang for "To." and "From.". Both are self-hosted by `next/font` and loaded for the exact glyphs before drawing.
  - Messages wrap at spaces, so Korean words stay whole.
  - Long runs without spaces (long English words, Japanese) break between characters.
  - Explicit line breaks are kept.
  - The text shrinks from 56 px down to 32 px until it fits.
- **Limits.** Names are capped at 20 characters and messages at 150. Characters are counted as users perceive them, and limits apply after IME composition ends. Messages can have at most 8 lines.
- **Privacy.** Names and messages exist only in memory while the card is open. They are never stored or sent anywhere, and closing the card discards them.
- **Sharing.**
  - The preview shows the exact PNG that is saved or shared.
  - "Share" passes the file to `navigator.share` when `navigator.canShare` allows it. Cancelling the share sheet is a normal outcome, not an error.
  - Without file sharing, the sheet suggests saving the image or long-pressing it.
  - "마을 주소 복사" copies the public link as a separate action.

## How the art is made

All graphics are original and generated by code, with no image tools or AI images. `scripts/generate-assets.ts` draws on a small RGBA pixel canvas (`scripts/lib/px.ts`, no dependencies, PNGs encoded with `node:zlib`). It writes:

- `public/assets/christmas/**`: 92 transparent PNGs, about 115 KB in total. The folder is rebuilt from scratch on every run.
- `src/constants/sprites.json`: sprite sizes, building anchors (door, doorstep gift, chimney), and the animation frame tables for Santa and the sleigh.
- `src/app/opengraph-image.png` and `src/app/icon.png`.

The art follows these rules:

- One shared palette (`scripts/lib/palette.ts`).
- Moonlight comes from the upper left.
- Buildings are front-facing on a top-down snow field, as in classic cozy RPGs.
- Ordered (Bayer) dithering is used instead of gradients.
- Output is deterministic because generation is seeded.
- Each building has three aligned layers: `base` (asleep), `lit` (window glow) and `decor` (that house's decorations).

| File                     | Contents                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `art/houses.ts`          | the five original cottages                                                                |
| `art/buildings.ts`       | gift workshop, chapel, tea house, A-frame, woodshed, neighbours' recolours, props, bridge |
| `art/characters.ts`      | Santa (4-way walk, idle blink, place, cheer, empty/full sack), Rudolph + sleigh team      |
| `art/terrain.ts`         | the whole ground: snow drifts, trodden roads, cobbled plaza, frozen river and pond        |
| `art/background.ts`      | sky, stars, moon, mountains and the forest horizon                                        |
| `art/tree.ts`, `pine.ts` | the plaza tree (dark and lit layers), tiered pines                                        |
| `art/gifts.ts`           | four wrapping papers, eight gift items                                                    |

## How it works

```text
src/
  game/                     Phaser 3 (client-only, loaded with a dynamic import)
    world.ts                the map as data: buildings, roads, river, lamps, props, pine scatter
    grid.ts                 4 px walkability grid, A* + string-pulling (pure, tested)
    VillageScene.ts         world building, input, camera, sequences (intro, pickup, deliveries, finale)
    Santa.ts, Sleigh.ts     character controllers (sleigh = ground point + altitude + shadow)
    capture.ts              1:1 offscreen render of a world rectangle for the photo
  components/christmas/     React overlay: landing, HUD, toasts, hints, photo sheet, restart
  features/village/         game.ts (pure reducer + save validation), store.ts (shared store)
  components/card/          card editor (paper note) and postcard preview sheet
  features/sharing/         card.ts (personal postcard), postcard.ts (free photo, share, download), text.ts
  lib/storage/              the only module that touches LocalStorage
  constants/                copy (all Korean text), sprite metadata
scripts/                    asset generator
tests/                      rules, migration and map tests
```

- **React and Phaser.** React owns the page and all UI. `ChristmasVillage` imports `game/createGame` in an effect, so Phaser never runs during server rendering. The game is created once and destroyed on unmount. Both sides use the same module-level store: React reads it with `useSyncExternalStore`, and the scene dispatches actions to it and subscribes. Events the UI needs (toasts, busy, intro, near prompt) flow back through a single callback.
- **Rendering.** Pixel-art mode with an integer camera zoom chosen from the viewport (about 200–300 art pixels on the short side), so the map never shrinks to fit a phone. Depth sorting uses each object's ground line, so Santa walks in front of and behind buildings and trees. Glows are additive sprites above a night-tint layer. Snow is particles emitted around the camera in world space.
- **Movement.** Taps resolve to a building, the sleigh or the tree when a non-transparent pixel is hit; otherwise to the nearest walkable cell. Footprints are placed by distance walked (not per animation frame), alternate left and right, fade out, and come from a fixed pool of 64. They are skipped on cobbles and bridge planks.
- **Persistence.** The save holds whether the sleigh has landed, the sack, the deliveries and Santa's last resting point. Stored data is validated on load. Saves from the earlier single-screen version (v1) are migrated, and anything inconsistent starts a fresh village.
- **Accessibility.** Keyboard play, a destination list for screen readers, status changes in a live region. With `prefers-reduced-motion`, the intro and camera pans are skipped, the finale lap is dropped, and the twinkles and snow slow down.
- **Performance.** Phaser pauses when the tab is hidden. Textures are loaded once and shared, particle counts are capped, and the Phaser chunk (≈1.2 MB minified) loads only after first paint.

## Deployment

The app is fully static: every route is prerendered. On **Vercel**, import the repository with the default Next.js settings. No environment variables are required. `metadataBase` uses `VERCEL_PROJECT_PRODUCTION_URL` automatically. You can override it with `NEXT_PUBLIC_SITE_URL`, which other hosts need for absolute OG image URLs.

For any other static host, add `output: "export"` to `next.config.ts` and upload `out/`.

## Known limitations

- Verified in headless Chrome (phone and desktop sizes, reduced motion). Real iOS Safari, Android share sheets and Firefox haven't been tested yet.
- Image file sharing depends on the platform and browser. Where it isn't available, the image is saved instead. Real KakaoTalk and Instagram share targets haven't been tried on devices yet.
- Japanese text and emoji fall back to system fonts, because the handwriting font covers only Korean and Latin.
- The sleigh can't be ridden freely. It appears in the intro, the chimney delivery and the finale.
- There is no audio.
