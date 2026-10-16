/*
 * Drag-to-rotate state, shared outside React (same pattern as ECLIPSE's
 * watchInteraction.ts and lib/carMaterials.ts).
 *
 * The 3D canvas has pointer-events: none so it never blocks the page. So the
 * dragging happens on an invisible HTML element over the car
 * (components/sections/DragToRotate.tsx), which writes here, and Car.tsx reads
 * it every frame. Neither side re-renders React while you drag.
 *
 * Unlike the watch (which sprang back after a drag), the car behaves like a
 * showroom turntable: it stays where you leave it while you're in the
 * configurator, slowly spins on its own when left alone, and only returns to
 * its home angle when you scroll away.
 */
export const carSpin = {
  dragging: false,
  /** Turntable angle (radians) on top of the camera pose. */
  offset: 0,
  /** Spin speed (radians/second) at release, for the "flick" inertia. */
  velocity: 0,
  /** Seconds since the visitor last touched the car (drives the idle auto-spin). */
  idle: 0,
  /** True while the configurator section is on screen. Set by Car.tsx. */
  active: false,
};
