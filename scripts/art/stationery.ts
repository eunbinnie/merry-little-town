// The handwritten card's stationery: a seamless paper-grain tile and two small
// pixel accents (holly sprig, postage stamp) shared by the editor and the PNG.
import { Px, rng } from "../lib/px.ts";
import { C } from "../lib/palette.ts";

/** Seamless 48×48 cream paper with faint flecks and fibres. */
export function paperTile(): Px {
  const N = 48;
  const px = new Px(N, N);
  px.rect(0, 0, N, N, C.paper);
  const r = rng(1224);
  for (let i = 0; i < 160; i++) px.set(Math.floor(r() * N), Math.floor(r() * N), C.paper1);
  for (let i = 0; i < 26; i++) px.set(Math.floor(r() * N), Math.floor(r() * N), C.paper2);
  // short fibres, wrapped around the edges so the tile repeats cleanly
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * N);
    const y = Math.floor(r() * N);
    const len = 2 + Math.floor(r() * 3);
    const horizontal = r() < 0.6;
    for (let k = 0; k < len; k++)
      px.set(horizontal ? (x + k) % N : x, horizontal ? y : (y + k) % N, C.paper1);
  }
  return px;
}

export function holly(): Px {
  const px = new Px(21, 15);
  px.map(
    0,
    0,
    [
      "....aa...............",
      "...abba.....aa.......",
      "..abbcba...abba......",
      ".abbcbba..abcbba.....",
      "abbcbbba.abcbbbba....",
      ".abcbbba.abbcbbbba...",
      "..acbba...abbcbbbba..",
      "...aba..rr..abbcbba..",
      "....a..rRRr..abbba...",
      ".......rRRr...aba....",
      "........rr.rr..a.....",
      "..........rRRr.......",
      "..........rRRr.......",
      "...........rr........",
    ],
    { a: C.paperPine, b: C.pine3, c: C.pine4, r: C.paperRed, R: C.red4 },
  );
  return px;
}

/** Postage stamp with perforated edges: a tiny lit cottage in the snow. */
export function stamp(): Px {
  const W = 22;
  const H = 26;
  const px = new Px(W, H);
  px.rect(0, 0, W, H, C.ivory);
  // perforation notches
  for (let x = 1; x < W; x += 3) {
    px.erase(x, 0);
    px.erase(x, H - 1);
  }
  for (let y = 1; y < H; y += 3) {
    px.erase(0, y);
    px.erase(W - 1, y);
  }
  // picture
  px.rect(3, 3, 16, 20, C.sky3);
  px.rect(3, 3, 16, 7, C.sky2);
  px.set(6, 5, C.star);
  px.set(15, 7, C.star);
  px.set(12, 4, C.starDim);
  px.rect(3, 18, 16, 5, C.snow4);
  px.hline(3, 18, 18, C.snow5);
  px.map(
    6,
    10,
    [
      "...rr....",
      "..rrrr...",
      ".rrrrrr..",
      "rrrrrrrr.",
      ".wwwwww..",
      ".wlwwdw..",
      ".wwwwdw..",
      ".wwwwdw..",
    ],
    { r: C.paperRed, w: C.plaster2, l: C.lit3, d: C.wood2 },
  );
  px.rect(16, 13, 1, 5, C.pine2);
  px.set(15, 14, C.pine3);
  px.set(17, 15, C.pine3);
  // frame shadow
  px.rect(3, 3, 16, 1, C.paper3);
  return px;
}
