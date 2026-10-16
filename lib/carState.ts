"use client";

import { useSyncExternalStore } from "react";

/*
 * ─── WHAT THE CAR IS DOING: doors, lids, lights, camera-in-the-cabin ──────────
 *
 * Same pattern as the shared materials: plain objects outside React.
 * Two layers write here, and Car.tsx / CameraRig.tsx read them every frame:
 *
 *   story  — written by the scroll timelines (components/three/story.ts).
 *            Each value is 0…1 (0 = closed / off, 1 = open / on).
 *   user   — written by the configurator's "Try it" toggles and Interior tab.
 *
 * The car shows the combination: a door is open if the story OR the visitor
 * opened it; the headlights are on if the story has them on AND the visitor
 * hasn't switched them off.
 */
export const story = {
  doors: 0,
  frontLid: 0,
  rearLid: 0,
  headlights: 1,
  taillights: 1,
  brake: 0, // brake-light flash on top of the tail-lights
  screen: 0, // dashboard display
  ambient: 1, // the whole scene's brightness (dimmed for the "lights off" moment)
};

export type Toggles = {
  lights: boolean;
  doors: boolean;
  frontLid: boolean;
  rearLid: boolean;
  /** Interior tab open: doors open + camera glides into the cabin. */
  cabin: boolean;
};

const DEFAULT_TOGGLES: Toggles = { lights: true, doors: false, frontLid: false, rearLid: false, cabin: false };

/*
 * The toggles live in a tiny store (like lib/selection.ts) so the panel's
 * buttons stay in sync when they are reset from outside (Car.tsx resets them
 * when you scroll away from the configurator).
 */
let toggles: Toggles = DEFAULT_TOGGLES;
const listeners = new Set<() => void>();

export const getToggles = () => toggles;

export function setToggle<K extends keyof Toggles>(key: K, value: Toggles[K]) {
  if (toggles[key] === value) return;
  toggles = { ...toggles, [key]: value };
  listeners.forEach((l) => l());
}

export function resetToggles() {
  if (toggles === DEFAULT_TOGGLES) return;
  toggles = DEFAULT_TOGGLES;
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useToggles() {
  return useSyncExternalStore(subscribe, getToggles, () => DEFAULT_TOGGLES);
}

/** The combined targets the 3D eases toward (story + toggles). Called every frame. */
export function carTargets() {
  const t = toggles;
  return {
    doors: Math.max(story.doors, t.doors || t.cabin ? 1 : 0),
    frontLid: Math.max(story.frontLid, t.frontLid ? 1 : 0),
    rearLid: Math.max(story.rearLid, t.rearLid ? 1 : 0),
    headlights: story.headlights * (t.lights ? 1 : 0),
    taillights: story.taillights * (t.lights ? 1 : 0),
    brake: story.brake,
    screen: Math.max(story.screen, t.cabin ? 1 : 0),
    cabin: t.cabin ? 1 : 0,
    ambient: story.ambient,
  };
}
