"use client";

import { useSyncExternalStore } from "react";

/*
 * Tiny shared store for "how far along is the 3D?".
 * The model loader writes to it; the loading badge in the page reads it.
 *
 * useSyncExternalStore is React's built-in way to subscribe a component to a
 * value that lives OUTSIDE React (same idea as the shared materials). Only the
 * badge re-renders, about 20 times while the model downloads, then never again.
 */
type LoadState = { progress: number; ready: boolean };

let state: LoadState = { progress: 0, ready: false };
const listeners = new Set<() => void>();

function set(next: Partial<LoadState>) {
  state = { ...state, ...next }; // new object, so React notices the change
  listeners.forEach((l) => l());
}

export const setLoadProgress = (progress: number) => {
  if (Math.abs(progress - state.progress) >= 0.03 || progress === 1) set({ progress });
};
export const setSceneReady = () => set({ progress: 1, ready: true });

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const serverSnapshot: LoadState = { progress: 0, ready: false };

export function useLoadState() {
  return useSyncExternalStore(subscribe, () => state, () => serverSnapshot);
}
