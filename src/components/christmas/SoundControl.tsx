"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { COPY } from "@/constants/copy";
import {
  getSoundPrefs,
  serverSoundPrefs,
  setSoundPrefs,
  subscribeSound,
  unlockSound,
  type SoundPrefs,
} from "@/audio/sound";

const SPEAKER = [
  "....x.....",
  "...xx..x..",
  "xxxxx...x.",
  "xxxxx.x..x",
  "xxxxx.x..x",
  "xxxxx...x.",
  "...xx..x..",
  "....x.....",
];
const MUTED = [
  "....x.....",
  "...xx.....",
  "xxxxx.x..x",
  "xxxxx..xx.",
  "xxxxx..xx.",
  "xxxxx.x..x",
  "...xx.....",
  "....x.....",
];

function Speaker({ on }: { on: boolean }) {
  const rows = on ? SPEAKER : MUTED;
  return (
    <svg
      viewBox={`0 0 ${rows[0]!.length} ${rows.length}`}
      width={rows[0]!.length * 2}
      height={rows.length * 2}
      shapeRendering="crispEdges"
      className="shrink-0"
      aria-hidden
    >
      {rows.flatMap((r, y) =>
        [...r].map((ch, x) =>
          ch === "x" ? (
            <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
          ) : null,
        ),
      )}
    </svg>
  );
}

export function useSoundPrefs(): SoundPrefs {
  return useSyncExternalStore(subscribeSound, getSoundPrefs, serverSoundPrefs);
}

const GESTURES = ["pointerup", "touchend", "keydown"] as const;

/** After a reload, players who left sound on hear it again from their first tap or key. */
export function useSoundUnlock(): void {
  useEffect(() => {
    const unlock = () => unlockSound();
    for (const g of GESTURES) window.addEventListener(g, unlock, { capture: true, passive: true });
    return () => {
      for (const g of GESTURES) window.removeEventListener(g, unlock, { capture: true });
    };
  }, []);
}

/** Landing: one clear switch, off until the player turns it on. */
export function SoundToggle() {
  const p = useSoundPrefs();
  return (
    <button
      type="button"
      className="sound-chip"
      aria-pressed={p.on}
      onClick={() => setSoundPrefs({ on: !p.on })}
    >
      <Speaker on={p.on} />
      {COPY.sound.state(p.on)}
    </button>
  );
}

/** HUD: a small speaker; music, effects and wind can be switched separately. */
export function SoundMenu() {
  const p = useSoundPrefs();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="pixel-btn"
        data-variant="ghost"
        data-size="sm"
        aria-label={COPY.sound.settings}
        aria-expanded={open}
        aria-controls="sound-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <Speaker on={p.on} />
      </button>
      {open && (
        <div
          id="sound-menu"
          role="group"
          aria-label={COPY.sound.settings}
          className="plate fade-in absolute top-full right-0 mt-2 flex w-40 flex-col gap-1 p-2"
        >
          <button
            type="button"
            className="sound-chip w-full justify-start"
            aria-pressed={p.on}
            onClick={() => setSoundPrefs({ on: !p.on })}
          >
            <Speaker on={p.on} />
            {COPY.sound.state(p.on)}
          </button>
          {(["music", "sfx", "ambient"] as const).map((k) => (
            <label key={k} className="sound-option" data-disabled={!p.on || undefined}>
              <input
                type="checkbox"
                checked={p[k]}
                disabled={!p.on}
                onChange={(e) => setSoundPrefs({ [k]: e.target.checked })}
              />
              {COPY.sound[k]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
