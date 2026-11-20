# christmas-village

크리스마스가 도착하는 마을: a small explorable Christmas Eve village where you play as Santa. Rudolph lands the sleigh by the gift workshop. You walk the snowy streets, load wrapped presents from the sleigh and place them on doorsteps. Every gift lights up another house, and each delivery can become a handwritten Christmas card for a real person. You write "To." and a message, Santa slips away from the doorstep, and you get a 9:16 postcard of that house to send. After the last gift the big tree on the plaza glows, and the village stays open to wander. With sound on, a little village band plays a cheerful Jingle Bells theme, and every footstep, bell and lit window has its own small sound.

Everything runs in the browser. There is no backend, database or login, and progress is kept in LocalStorage.

## Commands

Requires Node ≥ 22.18. The asset script and the tests run TypeScript natively, without a build step. `.nvmrc` pins Node 26.

```bash
pnpm install
pnpm dev               # http://localhost:3000
pnpm build && pnpm start   # static export to out/, served locally
pnpm lint              # ESLint
pnpm typecheck         # tsc --noEmit (strict)
pnpm test              # node:test: game rules, save migration, map walkability, card text, card links
pnpm format            # Prettier (format:check in CI)
pnpm assets:generate   # regenerate every sprite, the ground, the OG image and the favicon
```

`pnpm assets:generate --preview <dir>` also writes full-map renders and a character sheet. During development, `/dev` lists every generated sprite; in production builds that page returns a 404.

## How to play

| Input                     | What it does                                                                  |
| ------------------------- | ----------------------------------------------------------------------------- |
| Tap / click the snow      | Santa walks there (A\* around buildings, trees, fences and the frozen water)  |
| Tap a house, sleigh, tree | Santa walks to it and acts: load gifts, place a gift, or look around          |
| Arrow keys / WASD         | Walk directly                                                                 |
| Space / Enter             | Act on whatever Santa is standing next to                                     |
| Mouse wheel / pinch       | Zoom (trackpad pinch and two-finger pinch on phones too); +/− buttons as well |
| Map button                | The whole village: tap a house, then 찾아가기, and Santa walks there          |
| 가까운 집 찾기 / ◎        | Walk to the nearest house still waiting / bring the camera back to Santa      |
| Hidden "바로 가기" list   | Tab into it for keyboard and screen-reader access to every destination        |

- **Gifts.** The sack holds three wrapped gifts. At the sleigh they pop out of the cargo, open, and drop into the sack. All seven houses get a different gift.
- **Deliveries.** Six houses get a doorstep delivery: Santa puts the gift down, the windows light up and the decorations appear. The townhouse door is snowed in, so Rudolph flies Santa up to the chimney, and the present stays visible sticking out of the chimney top.
- **Village changes as you go.** Street lamps and plaza lights turn on as houses are served, and the night tint eases. The strings of lights over the plaza and along the footbridge come on with their lamps, bulb after bulb along the wire.
- **Finale.** After the last gift, the camera visits the tree, the neighbours wake up and Rudolph does a lap. You can keep exploring afterwards.
- **Christmas card.**
  - Right after a delivery, sparkles settle on the gift and the camera frames the house. A small paper note opens with "To.", a message, and an optional "From.".
  - "카드 완성하기" makes Santa walk quietly away, leaving footprints in the snow, and the postcard of that exact house is rendered.
  - From the preview you can share, save, edit the letter, or go back to the village. Editing reuses the rendered scene, so it never repeats the delivery.
  - "나중에 쓸게요" skips the card. Tapping a served house later opens its card again.
- **Photo.** "사진" renders the area around Santa at 1:1, with markers and the tap ring left out, framed as a simple 1080×1920 card.

### Sound

Everything you hear is synthesised in the browser (`src/audio/`). There are no audio files, no audio services and no network requests. Each sound is rendered once into a buffer and afterwards only played back. On a laptop the whole set takes about 4 s, and the page never pauses for more than 0.1 s.

- **The band** (`instruments.ts`).
  - Instruments: soft marimba, celesta, glockenspiel, flute, pizzicato strings, sustained strings, a round bass, sleigh bells and a woodblock.
  - Each has its own partials, envelope, filtering and articulation, with slightly humanised timing and dynamics.
  - Each distinct note is played once in an `OfflineAudioContext`, then copied onto the timeline with pan and velocity. One short, bright room and a soft compressor go over the mix. This keeps a 700-note arrangement cheap enough for a phone.
- **Music** (`music.ts`). A cheerful village theme in G major at 116 BPM: 32 bars, about 66 s, looping without a seam.
  - A, "welcome to the village": an original bouncy tune on marimba, with pizzicato off-beats and light bells.
  - B, Jingle Bells: first on marimba with a flute counter-line, then on flute and celesta over bouncing marimba eighths. Little celesta runs fill the long notes.
  - C, "a little Christmas magic": an original flute tune with celesta answers. It turns on D7 back into A.
- **Effects.**
  - Footsteps: four snow-crunch variants (lighter on the cobbles) and two for the bridge planks, with pitch and level varied slightly. They play every other footprint and never while Santa stands, flies or waits by a card.
  - Sleigh bells: a loop that follows the team's speed and fades as the team lands or leaves the screen.
  - Gifts: a paper rustle, then a quick rising sparkle with a jingle at the sleigh. A soft thud when the present touches the snow (or settles in the chimney).
  - Lit windows: a celesta arpeggio over a string swell, in three voicings that climb as more of the village lights up.
  - Cards: a paper rustle when the card opens, and a warm little marimba-and-flute cadence when the postcard is ready. The music steps back while a card is open.
  - Finale: "We Wish You a Merry Christmas" for the whole band when the tree lights up.
- **Ambience.** A very quiet breath of winter air under the music, kept clear of low rumble, and now and then a few soft, bright chimes.

| Melody                        | Source                                   | Status        |
| ----------------------------- | ---------------------------------------- | ------------- |
| Jingle Bells                  | James Lord Pierpont, 1857                | Public domain |
| We Wish You a Merry Christmas | Traditional English                      | Public domain |
| Village tunes A and C         | Written for this project (`music.ts`)    | Original      |
| Arrangements, instruments     | `instruments.ts`, `music.ts`, `synth.ts` | Original      |

**Controls and browsers.**

- Sound is off until the player turns it on: the switch under the start button, or the speaker in the HUD. The HUD menu switches music, effects and wind separately. Preferences are kept in LocalStorage.
- Nothing plays on page load. One `AudioContext` is created on the gesture that turns sound on. On later visits, the first tap or key brings the sound back.
- When sound is off or the tab is hidden, the master fades out and the context is suspended, so it uses no CPU.
- One-shots disconnect when they end, and there are per-sound and overall voice caps.

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
- **Privacy.** Names and messages exist only in memory while the card is open. They are never stored, and closing the card discards them. They leave the page only when the player shares the card: in the image, and in the card link, which carries the same text in its `#hash`. The hash never reaches the server, but anyone who has the link can read the card. The preview says so under the link.
- **Sharing.**
  - The preview shows the exact PNG that is saved or shared.
  - "Share" passes the file to `navigator.share` when `navigator.canShare` allows it, with a short line and the card link in `text` (not `url`, which iOS drops for many targets when files are attached). Cancelling the share sheet is a normal outcome, not an error.
  - Without file sharing, the sheet suggests saving the image or long-pressing it.
  - "카드 링크 복사" copies the card link as a separate action. The free photo copies the plain village link instead.
- **Receiving a card.** A card link (`#c=` + base64url JSON, `features/sharing/link.ts`) opens on "OO에게 크리스마스 카드가 도착했어요".
  - "선물 열어보기" skips the intro. The camera finds the sender's house, its windows light up and the gift sits on the doorstep. This is only shown, never saved, so the receiver's own village is untouched.
  - The note opens read-only. "나도 산타 되기" opens the gift (it disappears), removes the hash so later visits start normally, and hands the village to the receiver. Their first card is addressed to the sender.
  - Anyone can write a link, so every field is checked against the known houses, gifts and wraps and the editor's limits. The text is only ever rendered as text. A link that doesn't parse opens the normal landing.

## How the art is made

All graphics are original and generated by code, with no image tools or AI images. `scripts/generate-assets.ts` draws on a small RGBA pixel canvas (`scripts/lib/px.ts`, no dependencies, PNGs encoded with `node:zlib`). It writes:

- `public/assets/christmas/**`: 96 transparent PNGs, about 115 KB in total. The folder is rebuilt from scratch on every run.
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
  audio/                    instruments.ts (the band), music.ts (scores), synth.ts (foley + bank), sound.ts
  components/christmas/     React overlay: landing, HUD, sound menu, toasts, hints, photo sheet
  features/village/         game.ts (pure reducer + save validation), store.ts (shared store)
  components/card/          card editor (paper note), received note, postcard preview sheet
  features/sharing/         card.ts (personal postcard), postcard.ts (free photo, share, download), link.ts (card links), text.ts
  lib/storage/              the only module that touches LocalStorage
  constants/                copy (all Korean text), sprite metadata
scripts/                    asset generator
tests/                      rules, migration and map tests
```

- **React and Phaser.** React owns the page and all UI. `ChristmasVillage` imports `game/createGame` in an effect, so Phaser never runs during server rendering. The game is created once and destroyed on unmount. Both sides use the same module-level store: React reads it with `useSyncExternalStore`, and the scene dispatches actions to it and subscribes. Events the UI needs (toasts, busy, intro, near prompt) flow back through a single callback.
- **Rendering.** Pixel-art mode with an integer camera zoom chosen from the viewport (about 200–300 art pixels on the short side), so the map never shrinks to fit a phone. Depth sorting uses each object's ground line, so Santa walks in front of and behind buildings and trees. Glows are additive sprites above a night-tint layer.
- **Atmosphere.**
  - Snow falls in three depths, emitted around the camera and drifting with a slowly changing wind. The two far layers sit under the lamp glows, so flakes passing through lamplight turn warm. The occasional big near flake is left out of photos.
  - String lights and bunting are drawn from data (`STRANDS` in `world.ts`), the same pixels in the game and the generated map. Each bulb twinkles on its own slow phase.
  - Lantern flames and lit windows flicker gently, the frozen water catches a glint now and then, and the flying team leaves a faint trail of gold.
  - Only what is on screen is animated per frame.
- **Movement.** Taps resolve to a building, the sleigh or the tree when a non-transparent pixel is hit; otherwise to the nearest walkable cell. Footprints are placed by distance walked (not per animation frame), alternate left and right, fade out, and come from a fixed pool of 64. They are skipped on cobbles and bridge planks.
- **Persistence.** The save holds whether the sleigh has landed, the sack, the deliveries and Santa's last resting point. Stored data is validated on load. Saves from the earlier single-screen version (v1) are migrated, and anything inconsistent starts a fresh village.
- **Accessibility.** Keyboard play, a destination list for screen readers, status changes in a live region. With `prefers-reduced-motion`, the intro and camera pans are skipped, the finale lap is dropped, and the twinkles and snow slow down.
- **Performance.** Phaser pauses when the tab is hidden. Textures are loaded once and shared, particle counts are capped, and the Phaser chunk (≈1.2 MB minified) loads only after first paint.

## Deployment

The app is a static export (`output: "export"`): `pnpm build` writes the whole site to `out/`.

- **GitHub Pages.** `.github/workflows/deploy.yml` builds and deploys on every push to `main`. In the repository settings, Pages must use "GitHub Actions" as its source.
  - The site lives at `https://<user>.github.io/<repo>/`. The workflow passes `/<repo>` as `PAGES_BASE_PATH`, so pages, sprites, fonts, the card paper texture, the canvas images and the share link all resolve under it.
  - Locally the base path stays empty, so `pnpm dev` is unchanged.
- **Other static hosts.** Upload `out/`. Set `NEXT_PUBLIC_SITE_URL` to the site origin for absolute OG image URLs.

## Known limitations

- Verified in headless Chrome (phone and desktop sizes, reduced motion). Real iOS Safari, Android share sheets and Firefox haven't been tested yet.
- Image file sharing depends on the platform and browser. Where it isn't available, the image is saved instead. Real KakaoTalk and Instagram share targets haven't been tried on devices yet.
- Japanese text and emoji fall back to system fonts, because the handwriting font covers only Korean and Latin.
- The sleigh can't be ridden freely. It appears in the intro, the chimney delivery and the finale.
- Sound was checked by rendering every buffer in headless Chrome: levels, loop seams, and which sound plays at which moment. It hasn't been tuned by ear on phone speakers yet.
- On iPhone, Web Audio follows the silent switch, so the village stays quiet while the phone is on silent.
- No animals yet, and the pines don't sway: the village moves only where it adds something.
