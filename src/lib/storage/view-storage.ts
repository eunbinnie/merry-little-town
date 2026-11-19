// How the player likes to look at the village (LocalStorage).
export type ViewPrefs = {
  /** Preferred zoom, in whole steps from the default for the screen size. */
  zoomStep: number;
  /** The one-time "how to zoom" card has been seen. */
  guided: boolean;
};

const KEY = "christmas-village:view";
const DEFAULTS: ViewPrefs = { zoomStep: 0, guided: false };

export function loadView(): ViewPrefs {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return DEFAULTS;
    const r = raw as Record<string, unknown>;
    const step = typeof r.zoomStep === "number" && Number.isFinite(r.zoomStep) ? r.zoomStep : 0;
    return {
      zoomStep: Math.max(-4, Math.min(4, Math.round(step))),
      guided: r.guided === true,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveView(patch: Partial<ViewPrefs>): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...loadView(), ...patch }));
  } catch {
    // blocked storage: the preference just won't be remembered
  }
}
