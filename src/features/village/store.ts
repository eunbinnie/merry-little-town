"use client";

import { useSyncExternalStore } from "react";
import { loadVillage, saveVillage } from "@/lib/storage/village-storage";
import { reduce, type Action, type VillageState } from "./game";

// Module-level store read through useSyncExternalStore: the server snapshot is
// `null`, so hydration matches the server HTML and the client then swaps in
// the persisted state without effects or flashes of wrong content.
let state: VillageState | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): VillageState {
  state ??= loadVillage();
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dispatch(action: Action): void {
  const next = reduce(getSnapshot(), action);
  if (next === state) return;
  state = next;
  saveVillage(next);
  listeners.forEach((l) => l());
}

/** `null` until hydrated on the client. */
export function useVillage(): VillageState | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
