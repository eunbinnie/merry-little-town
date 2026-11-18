// Sound preferences (LocalStorage, like the village save).
export type SoundPrefs = { on: boolean; music: boolean; sfx: boolean; ambient: boolean };

const KEY = "christmas-village:sound";
export const SOUND_DEFAULTS: SoundPrefs = { on: false, music: true, sfx: true, ambient: true };

export function loadSoundPrefs(): SoundPrefs {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return SOUND_DEFAULTS;
    const p = { ...SOUND_DEFAULTS };
    for (const k of Object.keys(p) as Array<keyof SoundPrefs>) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === "boolean") p[k] = v;
    }
    return p;
  } catch {
    return SOUND_DEFAULTS;
  }
}

export function saveSoundPrefs(p: SoundPrefs): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // blocked storage: the choice just won't be remembered
  }
}
