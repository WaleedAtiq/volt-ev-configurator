/*
 * The options shown in the configurator — plain data, no Three.js.
 * The UI reads this file to draw the buttons; lib/carMaterials.ts and
 * components/three/environments.ts turn a choice into 3D changes.
 */

// ─── Paint ──────────────────────────────────────────────────────────────────────
// Each paint describes a *material*, not just a color. What makes gloss, metallic,
// matte and pearl look different is how they reflect light:
//   metalness          0 = solid paint, higher = metal flakes in the paint
//   roughness          0 = mirror-sharp reflections, 1 = completely diffuse
//   clearcoat          the glossy lacquer layer on top (1 = full lacquer)
//   clearcoatRoughness how sharp that lacquer is (0 = wet-look)
//   iridescence        color shift with viewing angle (pearl paints)

export type PaintFinish = "Gloss" | "Metallic" | "Matte" | "Pearl";

export type Paint = {
  name: string;
  finish: PaintFinish;
  desc: string;
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  iridescence: number;
  swatch: [string, string]; // two colors for the round swatch button gradient
};

export const PAINTS: Paint[] = [
  {
    name: "Obsidian",
    finish: "Metallic",
    desc: "Near-black with a dark metallic sparkle that only shows in the light.",
    color: "#111318",
    metalness: 0.6,
    roughness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 0,
    swatch: ["#3a3f4a", "#08090c"],
  },
  {
    name: "Arc Blue",
    finish: "Metallic",
    desc: "Deep electric blue with a fine metallic flake under a mirror clear-coat.",
    color: "#1c4fd8",
    metalness: 0.7,
    roughness: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 0,
    swatch: ["#4f7dff", "#0f2a7a"],
  },
  {
    name: "Glacier White",
    finish: "Gloss",
    desc: "Clean solid white. Every reflection reads crisp and bright.",
    color: "#e7eaef",
    metalness: 0,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 0,
    swatch: ["#ffffff", "#c4cad4"],
  },
  {
    name: "Volt Lime",
    finish: "Gloss",
    desc: "The signature launch color. Unmissable, unapologetic.",
    color: "#b4ea2a",
    metalness: 0.05,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 0,
    swatch: ["#d8ff5c", "#7fae0f"],
  },
  {
    name: "Lunar Grey",
    finish: "Matte",
    desc: "Satin matte grey. No lacquer shine, just soft, sculpted light.",
    color: "#6d737c",
    metalness: 0.35,
    roughness: 0.62,
    clearcoat: 0,
    clearcoatRoughness: 0.5,
    iridescence: 0,
    swatch: ["#8e949d", "#4a4f57"],
  },
  {
    name: "Aurora Pearl",
    finish: "Pearl",
    desc: "A pearlescent white that shifts toward violet and teal as you move.",
    color: "#d5dae3",
    metalness: 0.25,
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    iridescence: 1,
    swatch: ["#f2e9ff", "#9fd8e0"],
  },
  {
    name: "Ember Red",
    finish: "Metallic",
    desc: "A rich candy red that glows deeper in the shadows.",
    color: "#a3101c",
    metalness: 0.6,
    roughness: 0.36,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 0,
    swatch: ["#e0303e", "#5e0710"],
  },
];

// ─── Wheels ─────────────────────────────────────────────────────────────────────
// The model has one rim design, so a wheel option is a finish package: the rim
// face finish plus the brake-caliper color you see behind the spokes.

/** A simple (non-lacquered) surface: metal or plastic. */
export type Surface = { color: string; metalness: number; roughness: number };

export type WheelOption = {
  name: string;
  desc: string;
  rim: Surface;
  caliper: string;
};

export const WHEELS: WheelOption[] = [
  {
    name: "Stealth Black",
    desc: "Gloss black faces with signature Volt Lime calipers.",
    rim: { color: "#121316", metalness: 0.6, roughness: 0.22 },
    caliper: "#b4ea2a",
  },
  {
    name: "Mirror Chrome",
    desc: "Polished chrome faces that throw every reflection back, with red calipers.",
    rim: { color: "#ffffff", metalness: 1, roughness: 0.05 },
    caliper: "#a6101c",
  },
  {
    name: "Forged Bronze",
    desc: "Satin bronze, the classic grand-tourer look, over graphite calipers.",
    rim: { color: "#a77c4f", metalness: 1, roughness: 0.32 },
    caliper: "#2b2d31",
  },
  {
    name: "Aero Titanium",
    desc: "Brushed titanium faces and silver calipers for a clean, technical look.",
    rim: { color: "#9ea4ad", metalness: 1, roughness: 0.38 },
    caliper: "#c9ced6",
  },
];

// ─── Trim ───────────────────────────────────────────────────────────────────────
// Two parts of the car: the window surrounds, and the contrast panels (roof,
// sills, rear diffuser). "body" = the panels follow the paint (monochrome look).

export type Lacquer = Surface & { clearcoat: number };

export type TrimOption = {
  name: string;
  desc: string;
  surround: Surface;
  contrast: Lacquer | "body";
};

export const TRIMS: TrimOption[] = [
  {
    name: "Shadowline",
    desc: "Everything blacked-out: gloss black roof, sills and window line.",
    surround: { color: "#08090b", metalness: 0.3, roughness: 0.25 },
    contrast: { color: "#07080a", metalness: 0.3, roughness: 0.25, clearcoat: 1 },
  },
  {
    name: "Brightwork",
    desc: "Polished chrome window surrounds against the black floating roof.",
    surround: { color: "#f2f4f7", metalness: 1, roughness: 0.06 },
    contrast: { color: "#07080a", metalness: 0.3, roughness: 0.25, clearcoat: 1 },
  },
  {
    name: "Monochrome",
    desc: "Roof and sills in the body color, for one uninterrupted shape.",
    surround: { color: "#08090b", metalness: 0.3, roughness: 0.25 },
    contrast: "body",
  },
  {
    name: "Titanium",
    desc: "Satin titanium roof, sills and window line, with no lacquer shine.",
    surround: { color: "#8d939c", metalness: 1, roughness: 0.35 },
    contrast: { color: "#7d838c", metalness: 1, roughness: 0.38, clearcoat: 0 },
  },
];

// ─── Interior ───────────────────────────────────────────────────────────────────
// The seats, door cards and steering-wheel rim. "sheen" gives leather/knit the
// soft brightening along its edges that a plain matte material lacks.

export type InteriorOption = { name: string; desc: string; color: string; roughness: number; sheen: number };

export const INTERIORS: InteriorOption[] = [
  { name: "Cognac", desc: "Warm, hand-finished cognac leather with tonal stitching.", color: "#7a4022", roughness: 0.55, sheen: 0.5 },
  { name: "Oxblood", desc: "Deep oxblood red, the classic grand-tourer cabin.", color: "#5a0f15", roughness: 0.5, sheen: 0.5 },
  { name: "Ivory", desc: "Light ivory knit that makes the cabin feel twice the size.", color: "#d6cfc2", roughness: 0.7, sheen: 0.8 },
  { name: "Charcoal", desc: "Charcoal recycled knit: dark, calm and hard-wearing.", color: "#1d1e22", roughness: 0.75, sheen: 0.9 },
];

// ─── Environment ────────────────────────────────────────────────────────────────
// The 3D values for each one (reflections, lights, sky) live in
// components/three/environments.ts. This is only what the UI shows.

export type EnvironmentId = "studio" | "night" | "outdoor";

export type EnvironmentOption = { id: EnvironmentId; name: string; desc: string };

export const ENVIRONMENTS: EnvironmentOption[] = [
  { id: "studio", name: "Studio", desc: "Softbox lighting, the way cars are photographed for brochures." },
  { id: "night", name: "Night", desc: "Wet asphalt, neon rim light and headlights on." },
  { id: "outdoor", name: "Outdoor", desc: "Golden-hour dusk, with a low warm sun behind the car." },
];
