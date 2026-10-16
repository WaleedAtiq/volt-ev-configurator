"use client";

import { useSyncExternalStore } from "react";
import { PAINTS, TRIMS, WHEELS, INTERIORS, ENVIRONMENTS } from "./paints";

/*
 * The visitor's current choices, by NAME, for the HTML that shows them
 * (the configurator panel writes, the Reserve section's summary reads).
 *
 * Same pattern as lib/loadProgress.ts: a value outside React plus
 * useSyncExternalStore, so only the components that display it re-render.
 * (The 3D side doesn't use this at all: it is driven by applyPaint() etc.)
 */
export type Selection = { paint: string; wheels: string; interior: string; trim: string; environment: string };

let selection: Selection = {
  paint: PAINTS[0].name,
  wheels: WHEELS[0].name,
  interior: INTERIORS[0].name,
  trim: TRIMS[0].name,
  environment: ENVIRONMENTS[0].name,
};
const initial = selection;
const listeners = new Set<() => void>();

export function setSelection(part: Partial<Selection>) {
  selection = { ...selection, ...part }; // new object, so React notices the change
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useSelection() {
  return useSyncExternalStore(subscribe, () => selection, () => initial);
}
