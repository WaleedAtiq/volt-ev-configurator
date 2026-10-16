/*
 * ─── SCROLL CHOREOGRAPHY DATA ─────────────────────────────────────────────────
 *
 * ECLIPSE moved the watch itself. A car stands on the ground, so here the car
 * stays put and the CAMERA moves: around it like a photographer walking round a
 * showroom car, and once into the driver's seat. GSAP blends from one camera
 * stop to the next as you scroll (see components/three/CameraRig.tsx).
 * What the car does at each stop (doors, lids, lights) is in components/three/story.ts.
 *
 * The angle (az) only ever DEcreases down the page, so the camera keeps walking
 * around the car in one direction instead of swinging back and forth.
 *
 * Units:
 *   az    → angle around the car, in radians. 0 = straight at the nose,
 *           -π/2 = the car's left side, -π = straight at the tail.
 *           (A full lap is 2π ≈ 6.28, so -6.28 is the nose again.)
 *   el    → camera height as an angle above the ground (0.15 ≈ 9°, eye level)
 *   fill  → how much of the screen WIDTH the car takes up (0.5 = half). The
 *           camera distance is calculated from this, so the car is framed the
 *           same on a phone, a laptop and an ultrawide monitor.
 *   x, y  → where the car sits on screen, as a fraction of the screen
 *           (x 0.2 = a fifth of the screen right of center; y 0.2 = higher up)
 *   cabin → 0 = outside the car … 1 = in the driver's seat, looking ahead
 */
export type Pose = { az: number; el: number; fill: number; x: number; y: number; cabin: number };

const PI = Math.PI;
const LAP = PI * 2;

/** Shorthand: an outside pose (cabin 0). */
const out = (az: number, el: number, fill: number, x: number, y: number): Pose => ({ az, el, fill, x, y, cabin: 0 });

/**
 * Camera stops, in page order. Each id must exist as an id="" in the page and
 * be at least ~1 screen tall (the scroll ranges rely on it).
 * Desktop: the car sits opposite the text. Mobile: always centered, in the top
 * half of the screen above the text.
 */
export const CAMERA_STOPS: { id: string; desktop: Pose; mobile: Pose }[] = [
  // Hero: front 3/4, right of the headline.
  { id: "hero", desktop: out(0.7, 0.04, 0.54, 0.2, -0.06), mobile: out(0.7, 0.06, 0.98, 0, 0.2) },
  // Light signature: nose-on, while the headlights go dark and flicker back on.
  { id: "design-front", desktop: out(0, 0.03, 0.36, 0.2, -0.02), mobile: out(0, 0.04, 0.64, 0, 0.22) },
  // Profile.
  { id: "design-side", desktop: out(-PI / 2, 0.02, 0.52, 0.2, -0.02), mobile: out(-PI / 2, 0.03, 0.96, 0, 0.22) },
  // Doors: a little behind the side, a little higher, so you see them rise.
  { id: "doors", desktop: out(-1.85, 0.12, 0.52, 0.2, 0), mobile: out(-1.85, 0.14, 0.96, 0, 0.22) },
  // Interior: the same outside position, but fully blended into the driver's seat.
  // (Starting beside the open door means the camera flies in through it.)
  {
    id: "interior",
    desktop: { ...out(-1.85, 0.12, 0.52, 0.15, 0), cabin: 1 },
    mobile: { ...out(-1.85, 0.14, 0.96, 0, 0.12), cabin: 1 }, // display just above the text
  },
  // Trunk: high rear 3/4, looking down into the opening rear clamshell.
  { id: "trunk", desktop: out(-(PI - 0.6), 0.3, 0.48, -0.2, -0.04), mobile: out(-(PI - 0.6), 0.32, 0.95, 0, 0.22) },
  // Frunk: high and mostly side-on from the right. (From the front, the lifting
  // clamshell comes straight at the camera and hides the opening.)
  { id: "frunk", desktop: out(-(LAP - 1.2), 0.42, 0.44, 0.2, -0.04), mobile: out(-(LAP - 1.2), 0.42, 0.9, 0, 0.22) },
  // Configurator: left-front 3/4, left of the panel.
  { id: "configure", desktop: out(-(LAP + 1.05), 0.08, 0.54, -0.17, 0), mobile: out(-(LAP + 1.05), 0.1, 0.96, 0, 0.25) },
  // Performance: low and dramatic, above the spec band.
  { id: "performance", desktop: out(-(LAP + 1.45), 0.02, 0.5, 0, 0.14), mobile: out(-(LAP + 1.45), 0.03, 0.95, 0, 0.24) },
  // Reserve: final front-left 3/4 hero shot, left of the reserve card.
  { id: "reserve", desktop: out(-(LAP + 0.75), 0.04, 0.54, -0.2, -0.04), mobile: out(-(LAP + 0.75), 0.06, 0.98, 0, 0.22) },
];

/** The page's sections, for the progress rail and the nav. */
export const SECTIONS = [
  { id: "hero", label: "Intro" },
  { id: "design", label: "Design" },
  { id: "inside", label: "Interior" },
  { id: "cargo", label: "Storage" },
  { id: "configure", label: "Configure" },
  { id: "performance", label: "Performance" },
  { id: "reserve", label: "Reserve" },
] as const;
