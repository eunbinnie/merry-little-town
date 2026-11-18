// Shared night-village palette. Moonlight comes from the upper left,
// so right-facing surfaces take the darker ramp step.
export const C = {
  // sky
  sky0: "#0a101d",
  sky1: "#101827",
  sky2: "#141f33",
  sky3: "#1a283f",
  sky4: "#22334f",
  sky5: "#2b405f",
  star: "#e8edf3",
  starWarm: "#f7f1e5",
  starDim: "#6f84a8",
  moon: "#f4eedc",
  moonShade: "#d9d1b8",
  moonDark: "#bdb59c",

  // mountains + forest silhouettes
  mtn0: "#1b273d",
  mtn1: "#24334f",
  mtn2: "#30436a",
  mtnSnow: "#9fb1cf",
  mtnSnowShade: "#7488ad",
  forest0: "#13202f",
  forest1: "#1a2c3d",
  forest2: "#22394b",
  forestSnow: "#6f87a8",

  // snow (moonlit)
  snow0: "#4e6389",
  snow1: "#6f86ad",
  snow2: "#93a8c9",
  snow3: "#b4c5dd",
  snow4: "#d2deec",
  snow5: "#e8edf3",
  snow6: "#f7f9fc",

  // pine
  pine0: "#0f2421",
  pine1: "#18342e",
  pine2: "#24493f",
  pine3: "#3c6654",
  pine4: "#558268",

  // wood
  wood0: "#2a1e1d",
  wood1: "#43302c",
  wood2: "#5c4339",
  wood3: "#77594a",
  wood4: "#94725c",
  wood5: "#b08b6e",

  // reds
  red0: "#4f1f28",
  red1: "#6e2b34",
  red2: "#923a3e",
  red3: "#b94b4b",
  red4: "#d46a5e",

  // gold / warm light
  gold0: "#7a4f28",
  gold1: "#a8743b",
  gold2: "#d9a04c",
  gold3: "#f4cf83",
  gold4: "#fbe8b8",
  ivory: "#f7f1e5",
  ivory1: "#ddd2c0",
  ivory2: "#b9ad9b",

  // walls (night-tinted)
  plaster0: "#6f6b7d",
  plaster1: "#8d899a",
  plaster2: "#aaa4b0",
  plaster3: "#c4bcc0",
  stone0: "#333b4f",
  stone1: "#4a536b",
  stone2: "#636e88",
  stone3: "#818ca4",
  brick0: "#43262d",
  brick1: "#5f3437",
  brick2: "#7b4542",
  mortar: "#6a6370",
  slate0: "#1e263a",
  slate1: "#2b3550",
  slate2: "#3b4867",
  slate3: "#4f5f82",

  // glass
  glass0: "#0b1322",
  glass1: "#152238",
  glass2: "#253a5c",
  glass3: "#3d5680",

  outline: "#0b101c",

  // window light
  lit0: "#b8743a",
  lit1: "#e2a252",
  lit2: "#f4cf83",
  lit3: "#fde6ad",
  lit4: "#fff6dc",
  curtain0: "#7a2f34",
  curtain1: "#a5453f",

  // bulbs (soft, not neon)
  bulbRed: "#ef7466",
  bulbGold: "#ffd98a",
  bulbGreen: "#8fd19e",
  bulbBlue: "#9cc4f0",
  bulbWhite: "#fff4d6",

  // misc
  blue0: "#25335a",
  blue1: "#33487a",
  blue2: "#4a659c",
  blue3: "#6f8cc0",
  cookie0: "#6b3d22",
  cookie1: "#9a5c30",
  cookie2: "#c07c42",
  cookie3: "#dc9d5f",
  carrot: "#e0823f",

  // stationery (the handwritten card)
  paper: "#f5e8ca",
  paper1: "#ebd8ae",
  paper2: "#dcc597",
  paper3: "#c8af83",
  paperInk: "#4b382a",
  paperRed: "#9d403e",
  paperPine: "#425a45",
  paperGold: "#c3a065",

  // characters
  skin0: "#c98a74",
  skin1: "#e9b394",
  skin2: "#f6d0b2",
  cheek: "#e5837a",
  ink: "#1a1220",
  boot0: "#171a26",
  boot1: "#2b3044",
  boot2: "#47506b",
  fur0: "#7b5a43",
  fur1: "#9b7354",
  fur2: "#b98f68",
  fur3: "#d7b48a",
  antler: "#e3d6bd",
  antlerShade: "#b4a387",
  nose: "#ff5a4f",
  ice0: "#22385e",
  ice1: "#2f4c78",
  ice2: "#41669a",
  ice3: "#6d8fc0",
  ice4: "#a5bfe0",
} as const;

export type ColorName = keyof typeof C;
