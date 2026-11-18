// The only place that touches LocalStorage. Swap this module for a remote
// store later without changing callers.
import { INITIAL_STATE, parseState, type VillageState } from "@/features/village/game";

// v1 saves live under the same key; parseState migrates them.
const KEY = "christmas-village:v1";

export function loadVillage(): VillageState {
  try {
    const raw = window.localStorage.getItem(KEY);
    return (raw && parseState(JSON.parse(raw))) || INITIAL_STATE;
  } catch {
    return INITIAL_STATE; // corrupted JSON, blocked storage, private mode…
  }
}

export function saveVillage(state: VillageState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked: progress just won't survive a refresh
  }
}
