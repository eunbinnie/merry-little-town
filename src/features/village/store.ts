"use client";

import { useSyncExternalStore } from "react";
import { loadVillage, saveVillage } from "@/lib/storage/village-storage";
import { reduce, type Action, type VillageState } from "./game";

// Module-level store shared by React (useSyncExternalStore) and the Phaser
// scene. The server snapshot is `null`, so hydration matches the server HTML
// and the client then swaps in the persisted state without flashes.
let state: VillageState | null = null;
const listeners = new Set<() => void>();

export function getVillage(): VillageState {
  state ??= loadVillage();
  return state;
}

export function subscribeVillage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dispatch(action: Action): void {
  const next = reduce(getVillage(), action);
  if (next === state) return;
  state = next;
  saveVillage(next);
  listeners.forEach((l) => l());
}

/** `null` until hydrated on the client. */
export function useVillage(): VillageState | null {
  return useSyncExternalStore(subscribeVillage, getVillage, () => null);
}
