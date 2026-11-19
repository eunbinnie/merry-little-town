// The one place that makes sound. A single AudioContext for the page, created
// on the first explicit gesture after the player turns sound on; nothing plays
// before that. Music, effects and ambience run on separate buses into a
// master gain and a gentle limiter. When sound is off or the tab is hidden the
// context is faded out and suspended, so it costs no CPU.
import {
  SOUND_DEFAULTS,
  loadSoundPrefs,
  saveSoundPrefs,
  type SoundPrefs,
} from "@/lib/storage/sound-storage";
import { renderBank, type Bank, type SoundName } from "./synth";

export type { SoundPrefs, SoundName };

const LEVEL = { music: 0.4, sfx: 0.8, ambient: 0.5 };
/**
 * Every buffer is normalised to the same peak; this is the mix. Footsteps sit
 * well under the music, the window chime and the finale rise above it.
 */
const GAIN: Record<SoundName, number> = {
  music: 1,
  bells: 1,
  step: 0.22,
  stepWood: 0.18,
  place: 0.45,
  rustle: 0.28,
  twinkle: 0.32,
  light: 0.62,
  paper: 0.3,
  postcard: 0.55,
  finale: 0.7,
  chime: 0.22,
};
/** At most this many of one sound at once (footsteps never pile up). */
const CAP: Partial<Record<SoundName, number>> = { step: 2, stepWood: 2, place: 2, light: 2 };
const MAX_VOICES = 12;

type Buses = { master: GainNode; music: GainNode; sfx: GainNode; ambient: GainNode };

let prefs: SoundPrefs | null = null;
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let bus: Buses | null = null;
const bank: Bank = {};
let rendering = false;
let musicSrc: AudioBufferSourceNode | null = null;
let windOn = false;
let bells: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let bellsLevel = 0;
let bellsStop = 0;
let voices = 0;
const perSound = new Map<SoundName, number>();
const ducks = new Map<string, number>();
let suspendTimer = 0;
/** Where the music loop was started, so a reopened context can pick it up mid-tune. */
let musicStart = 0;
let musicOffset = 0;
/**
 * The page went to the background. Phones (iOS Safari especially) can cut the
 * audio output then while the context still claims to be running, so the
 * first tap after coming back opens a fresh one.
 */
let away = false;
let chimeTimer = 0;

const hidden = () => document.visibilityState === "hidden";
const live = () => Boolean(ctx && getSoundPrefs().on && !hidden());

// ---------------------------------------------------------------- preferences

export function getSoundPrefs(): SoundPrefs {
  prefs ??= loadSoundPrefs();
  return prefs;
}
export const serverSoundPrefs = (): SoundPrefs => SOUND_DEFAULTS;

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Call from the click that changed the setting: turning sound on unlocks audio. */
export function setSoundPrefs(patch: Partial<SoundPrefs>): void {
  prefs = { ...getSoundPrefs(), ...patch };
  saveSoundPrefs(prefs);
  listeners.forEach((l) => l());
  if (prefs.on) unlockSound();
  apply();
}

// ---------------------------------------------------------------- lifecycle

/** From a user gesture: create (once) or resume the AudioContext. No-op when sound is off. */
export function unlockSound(): void {
  if (!getSoundPrefs().on || hidden()) return;
  if (ctx?.state === "running" && !away) return;
  if (ctx && away) reopen();
  if (!ctx) {
    if (!open()) return;
    document.addEventListener("visibilitychange", () => {
      if (hidden()) away = true;
      apply();
    });
  }
  if (!rendering) {
    rendering = true;
    renderBank((name, v) => {
      bank[name] = v;
      apply();
    }).catch((e: unknown) => console.warn("Sound rendering stopped; the village stays quiet.", e));
  }
  apply();
}

/** A new AudioContext with its buses, created inside a user gesture. */
function open(): boolean {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return false;
  ctx = new AC({ latencyHint: "interactive" });
  bus = buses(ctx);
  // iOS: a silent blip inside the gesture fully opens the output
  const blip = ctx.createBufferSource();
  blip.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  blip.connect(ctx.destination);
  blip.start();
  return true;
}

/**
 * Back from another app: close the old context and open a new one in this
 * gesture. The rendered sounds are plain buffers and carry over; the music
 * continues from where it was.
 */
function reopen(): void {
  const old = ctx!;
  const m = bank.music?.[0];
  musicOffset = musicSrc && m ? Math.max(0, old.currentTime - musicStart) % m.duration : 0;
  void old.close().catch(() => undefined);
  ctx = null;
  bus = null;
  musicSrc = null;
  windOn = false;
  bells = null;
  bellsLevel = 0;
  voices = 0;
  perSound.clear();
  away = false;
  open();
}

function buses(c: AudioContext): Buses {
  const limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 8;
  limiter.ratio.value = 4;
  limiter.attack.value = 0.005;
  limiter.release.value = 0.25;
  limiter.connect(c.destination);
  const gain = (to: AudioNode) => {
    const g = c.createGain();
    g.gain.value = 0;
    g.connect(to);
    return g;
  };
  const master = gain(limiter);
  return { master, music: gain(master), sfx: gain(master), ambient: gain(master) };
}

/** Bring every bus and loop in line with the preferences, ducks and visibility. */
function apply(): void {
  if (!ctx || !bus) return;
  const p = getSoundPrefs();
  const now = ctx.currentTime;
  window.clearTimeout(suspendTimer);
  if (live()) {
    if (ctx.state !== "running") void ctx.resume().catch(() => undefined);
    bus.master.gain.setTargetAtTime(1, now, 0.08);
    startLoops(ctx, bus);
  } else {
    bus.master.gain.setTargetAtTime(0, now, 0.06);
    suspendTimer = window.setTimeout(() => void ctx?.suspend().catch(() => undefined), 400);
  }
  const duck = Math.min(1, ...ducks.values());
  bus.music.gain.setTargetAtTime(p.music ? LEVEL.music * duck : 0, now, p.music ? 0.7 : 0.25);
  bus.sfx.gain.setTargetAtTime(p.sfx ? LEVEL.sfx : 0, now, 0.05);
  bus.ambient.gain.setTargetAtTime(p.ambient ? LEVEL.ambient : 0, now, 0.8);
  scheduleChime();
}

function startLoops(c: AudioContext, b: Buses): void {
  const m = bank.music?.[0];
  if (m && !musicSrc) {
    musicSrc = c.createBufferSource();
    musicSrc.buffer = m;
    musicSrc.loop = true;
    musicSrc.connect(b.music);
    musicSrc.start(c.currentTime + 0.4, musicOffset);
    musicStart = c.currentTime + 0.4 - musicOffset;
  }
  if (!windOn) {
    windOn = true;
    wind(c, b.ambient);
  }
}

/**
 * A breath of winter air under the music: band-passed noise, kept well above
 * the low rumble and very quiet, whose colour and strength drift slowly.
 */
function wind(c: AudioContext, out: AudioNode): void {
  const sr = c.sampleRate;
  const buf = c.createBuffer(1, sr * 4, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 950;
  band.Q.value = 0.7;
  const soft = c.createBiquadFilter();
  soft.type = "highpass";
  soft.frequency.value = 420;
  const level = c.createGain();
  level.gain.value = 0.07;
  const lfo = (hz: number, amount: number, param: AudioParam) => {
    const o = c.createOscillator();
    o.frequency.value = hz;
    const g = c.createGain();
    g.gain.value = amount;
    o.connect(g).connect(param);
    o.start();
  };
  lfo(0.053, 250, band.frequency);
  lfo(0.087, 0.03, level.gain);
  src.connect(band).connect(soft).connect(level).connect(out);
  src.start();
}

/** Now and then, a few soft, bright chimes somewhere in the village. */
function scheduleChime(): void {
  const want = live() && getSoundPrefs().ambient;
  if (!want) {
    window.clearTimeout(chimeTimer);
    chimeTimer = 0;
    return;
  }
  if (chimeTimer) return;
  chimeTimer = window.setTimeout(
    () => {
      chimeTimer = 0;
      if (live() && bus) voice(bus.ambient, "chime", {});
      scheduleChime();
    },
    35000 + Math.random() * 35000,
  );
}

// ---------------------------------------------------------------- playing

type PlayOpts = { rate?: number; gain?: number; at?: number; variant?: number };

function voice(out: AudioNode, name: SoundName, o: PlayOpts): void {
  const list = bank[name];
  if (!ctx || !list?.length || ctx.state !== "running") return;
  const n = perSound.get(name) ?? 0;
  if (n >= (CAP[name] ?? 3) || voices >= MAX_VOICES) return;
  const src = ctx.createBufferSource();
  src.buffer = list[o.variant ?? Math.floor(Math.random() * list.length)] ?? list[0]!;
  src.playbackRate.value = o.rate ?? 1;
  const g = ctx.createGain();
  g.gain.value = GAIN[name] * (o.gain ?? 1);
  src.connect(g).connect(out);
  perSound.set(name, n + 1);
  voices++;
  const owner = ctx;
  src.onended = () => {
    src.disconnect();
    g.disconnect();
    if (owner !== ctx) return; // from a context that was replaced
    perSound.set(name, (perSound.get(name) ?? 1) - 1);
    voices--;
  };
  src.start(ctx.currentTime + (o.at ?? 0));
}

/** A one-shot effect. Silently skipped while sound is off, locked or still rendering. */
export function playSound(name: SoundName, o: PlayOpts = {}): void {
  if (bus && getSoundPrefs().sfx && live()) voice(bus.sfx, name, o);
}

/** Sleigh bells follow the team: 0 = parked or out of sight, 1 = flying close by. */
export function setBells(level: number): void {
  if (!ctx || !bus) return;
  const l = Math.max(0, Math.min(1, level));
  const buf = bank.bells?.[0];
  const start = l > 0 && !bells && buf && ctx.state === "running";
  if (!start && Math.abs(l - bellsLevel) < 0.04 && l > 0 === bellsLevel > 0) return;
  bellsLevel = l;
  if (start) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain).connect(bus.sfx);
    src.start();
    bells = { src, gain };
  }
  window.clearTimeout(bellsStop);
  if (!bells) return;
  const now = ctx.currentTime;
  bells.gain.gain.setTargetAtTime(l * 0.45, now, l > 0 ? 0.2 : 0.45);
  bells.src.playbackRate.setTargetAtTime(0.95 + l * 0.1, now, 0.3);
  if (l === 0)
    bellsStop = window.setTimeout(() => {
      bells?.src.stop();
      bells?.src.disconnect();
      bells?.gain.disconnect();
      bells = null;
    }, 3000);
}

/** Lower the music while something else matters (writing a card, the finale). */
export function duckMusic(reason: string, level: number | null): void {
  if (level === null) ducks.delete(reason);
  else ducks.set(reason, level);
  apply();
}
