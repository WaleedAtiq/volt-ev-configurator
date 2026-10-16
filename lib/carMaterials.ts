import * as THREE from "three";
import gsap from "gsap";
import {
  INTERIORS,
  PAINTS,
  TRIMS,
  WHEELS,
  type InteriorOption,
  type Lacquer,
  type Paint,
  type Surface,
  type TrimOption,
  type WheelOption,
} from "./paints";

/*
 * ─── THE "INSTANT REPAINT" TRICK (same as ECLIPSE's watchMaterials.ts) ─────────
 *
 * The naive React way to recolor a 3D model is to put the color in useState and
 * pass it as a prop. Every click would then re-render the whole 3D tree.
 *
 * Instead:
 *   1. Each material is created ONCE, here, outside React.
 *   2. When the car model loads (components/three/carModel.ts), its parts are
 *      switched over to these shared objects, by material name.
 *   3. The configurator calls applyPaint() / applyWheels() / applyTrim() /
 *      applyInterior(), which tween the materials' numbers directly with GSAP.
 *      Three.js reads them on the next frame.
 *
 * React never re-renders the 3D scene, so the change is instant and animates.
 * (The lights' brightness is not set here: it is animated every frame by Car.tsx
 * from lib/carState.ts, because both the scroll story and the toggles drive it.)
 */

/*
 * Gotcha: never tween clearcoat or iridescence all the way to 0.
 * Three.js compiles a different shader program for "has clear-coat" and "has no
 * clear-coat". Crossing 0 forces a recompile, which freezes the page for a moment
 * in the middle of the animation. 0.001 looks identical to 0 and keeps the same
 * shader for every option.
 */
const MIN_LAYER = 0.001;

/**
 * The current selection. The paint and the trim depend on each other (with
 * Monochrome trim, the roof follows the paint), so each apply function needs
 * to know what the other one picked.
 */
const config = { paint: PAINTS[0], wheels: WHEELS[0], trim: TRIMS[0], interior: INTERIORS[0] };

// ─── Body ───────────────────────────────────────────────────────────────────────

/** Main body color (doors, hood, fenders, mirror caps). */
export const paintMaterial = new THREE.MeshPhysicalMaterial({
  iridescenceIOR: 1.35,
  iridescenceThicknessRange: [180, 420], // nanometres: sets which colors the pearl shifts through
});

/**
 * The contrast panels: roof, sills, rear diffuser. Driven by the trim option.
 * It gets the same "layers" as the paint (clear-coat + iridescence) so that, with
 * Monochrome trim, it can match any paint exactly, including the pearl.
 */
export const contrastMaterial = new THREE.MeshPhysicalMaterial({
  iridescenceIOR: 1.35,
  iridescenceThicknessRange: [180, 420],
});

/** Window surrounds (the gaskets around the windshield and side windows). Driven by the trim option. */
export const surroundMaterial = new THREE.MeshStandardMaterial();

// ─── Wheels ─────────────────────────────────────────────────────────────────────

/** The rim's outer face (the inner part keeps the model's own dark material). */
export const rimMaterial = new THREE.MeshStandardMaterial();
/** Brake calipers, visible through the spokes. */
export const caliperMaterial = new THREE.MeshStandardMaterial({ metalness: 0.4, roughness: 0.3 });

// ─── Interior ───────────────────────────────────────────────────────────────────

/** Seats, door cards and steering-wheel rim. Driven by the interior option. */
export const interiorMaterial = new THREE.MeshPhysicalMaterial({ sheenRoughness: 0.6, sheenColor: "#ffffff" });

/**
 * The driver's display. Its picture is the model's "emissive map" (an image
 * that glows), replaced with a VOLT EV screen by scripts/prepare-model.py.
 * emissiveIntensity 0 = screen off; Car.tsx turns it on in the cabin.
 */
export const dashboardMaterial = new THREE.MeshStandardMaterial({
  color: "#020203",
  emissive: "#ffffff",
  emissiveIntensity: 0,
  roughness: 0.15,
  metalness: 0.2,
});

// ─── Glass ──────────────────────────────────────────────────────────────────────

/**
 * Tinted glass, see-through so the cabin shows (and so you can see out of it).
 * The model's own glass uses "transmission" (real refraction). That looks great,
 * but Three.js must render the entire scene a SECOND time each frame to compute
 * it, which roughly halves the frame rate on phones. A plain transparent,
 * dark-tinted, reflective material looks almost the same on car glass (which is
 * mostly reflection anyway) at a fraction of the cost.
 */
export const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: "#0b0e14",
  metalness: 0,
  roughness: 0.03,
  transparent: true,
  opacity: 0.45,
  envMapIntensity: 1.3,
  side: THREE.DoubleSide, // visible from inside the cabin too
});

// ─── Lights ─────────────────────────────────────────────────────────────────────
/*
 * "Emissive" = the surface gives off its own light, so it glows even in the
 * dark. emissiveIntensity is set every frame by Car.tsx (on/off from the scroll
 * story + toggles, strength from the environment).
 */
export const headlightMaterial = new THREE.MeshStandardMaterial({
  color: "#0c0d10",
  emissive: "#dfe9ff",
  emissiveIntensity: 2,
  roughness: 0.2,
  metalness: 0.5,
});
export const taillightMaterial = new THREE.MeshStandardMaterial({
  color: "#140203",
  emissive: "#ff1a22",
  emissiveIntensity: 1.5,
  roughness: 0.25,
  metalness: 0.3,
});
/** Turn signals (front + rear), amber. They blink as hazards while the doors move. */
export const signalMaterial = new THREE.MeshStandardMaterial({
  color: "#140a02",
  emissive: "#ff8a1a",
  emissiveIntensity: 0,
  roughness: 0.25,
  metalness: 0.3,
});

/**
 * Soft "contact shadow" under the car: a black plane whose transparency comes
 * from a blurry footprint drawn on a canvas (see carModel.ts). It is far
 * cheaper than real-time shadows and looks softer, like a studio photo.
 */
export const shadowMaterial = new THREE.MeshBasicMaterial({
  color: "#000000",
  transparent: true,
  depthWrite: false,
  opacity: 0.85,
});

// ─── Which part of the model gets which material ────────────────────────────────

/**
 * Model material name → our shared material. The names are set by
 * scripts/prepare-model.py when the .glb is built (see README). Parts not listed
 * here (tires, brake discs, rim inners, mechanical parts…) keep the model's own materials.
 */
export const SHARED_BY_MODEL_NAME: Record<string, THREE.MeshStandardMaterial> = {
  "Body Paint": paintMaterial,
  "Contrast Paint": contrastMaterial,
  "Window Trim": surroundMaterial,
  Glass: glassMaterial,
  Headlight: headlightMaterial,
  "Tail Light": taillightMaterial,
  "Turn Signal": signalMaterial,
  "Rim Face": rimMaterial,
  Caliper: caliperMaterial,
  "Interior Accent": interiorMaterial,
  "Dashboard Screen": dashboardMaterial,
};

/**
 * Polish for the parts that keep the model's OWN materials (not configurable):
 * tuned by name as the car loads (carModel.ts). The original values were close
 * to "default plastic"; these make each surface read as what it is.
 */
export const MODEL_MATERIAL_TWEAKS: Record<string, { color?: string; metalness?: number; roughness?: number }> = {
  Tireside: { roughness: 0.85 }, // rubber is matte, not glossy
  Tiretread: { color: "#151618", roughness: 0.92 },
  Disc: { color: "#8a8f96", metalness: 1, roughness: 0.38 }, // machined steel brake discs
  "Rim Inner": { color: "#0b0c0e", metalness: 0.4, roughness: 0.45 },
  Hardware: { color: "#b9bec6", metalness: 1, roughness: 0.3 }, // brushed aluminum handles + emblem
  "Black Trim": { color: "#0a0b0d", roughness: 0.55 }, // satin black trim, wipers, cage
  "Panel Sides": { metalness: 0.2, roughness: 0.55 },
  "Interior 1": { color: "#111215", roughness: 0.7 }, // soft-touch dashboard plastics
  "Interior 2": { color: "#111215", roughness: 0.7 },
  Floormat: { color: "#0d0e10", roughness: 1 }, // carpet: no shine at all
  Mechanical: { roughness: 0.7 },
};

// ─── Applying a choice ──────────────────────────────────────────────────────────

const TWEEN = { duration: 0.8, ease: "power2.inOut", overwrite: true }; // overwrite: rapid clicks don't fight

/** Tween a material's color. new THREE.Color("#hex") gives the r/g/b numbers (0–1) GSAP animates. */
function tweenColor(material: THREE.MeshStandardMaterial, hex: string, instant: boolean) {
  const c = new THREE.Color(hex);
  gsap.to(material.color, { r: c.r, g: c.g, b: c.b, ...TWEEN, duration: instant ? 0 : TWEEN.duration });
}

/** Plain metal/plastic surface. */
function tweenSurface(material: THREE.MeshStandardMaterial, s: Surface, instant = false) {
  tweenColor(material, s.color, instant);
  gsap.to(material, { metalness: s.metalness, roughness: s.roughness, ...TWEEN, duration: instant ? 0 : TWEEN.duration });
}

/** Lacquered surface (paint, or the contrast panels). */
function tweenLacquer(material: THREE.MeshPhysicalMaterial, l: Lacquer & Partial<Paint>, instant = false) {
  tweenColor(material, l.color, instant);
  gsap.to(material, {
    metalness: l.metalness,
    roughness: l.roughness,
    clearcoat: Math.max(MIN_LAYER, l.clearcoat),
    clearcoatRoughness: l.clearcoatRoughness ?? 0.03,
    iridescence: Math.max(MIN_LAYER, l.iridescence ?? 0),
    ...TWEEN,
    duration: instant ? 0 : TWEEN.duration,
  });
}

/** The contrast panels: either their own trim finish, or a copy of the paint (Monochrome). */
function tweenContrast(instant = false) {
  const c = config.trim.contrast;
  tweenLacquer(contrastMaterial, c === "body" ? config.paint : c, instant);
}

/** Repaint the body. Called straight from a click handler — no React state involved. */
export function applyPaint(paint: Paint) {
  config.paint = paint;
  tweenLacquer(paintMaterial, paint);
  if (config.trim.contrast === "body") tweenContrast(); // Monochrome: the roof follows
}

/** Change the wheel finish (rim faces + calipers). */
export function applyWheels(wheels: WheelOption, instant = false) {
  config.wheels = wheels;
  tweenSurface(rimMaterial, wheels.rim, instant);
  tweenColor(caliperMaterial, wheels.caliper, instant);
}

/** Change the trim (window surrounds + contrast panels). */
export function applyTrim(trim: TrimOption, instant = false) {
  config.trim = trim;
  tweenSurface(surroundMaterial, trim.surround, instant);
  tweenContrast(instant);
}

/** Change the cabin color (seats, door cards, steering-wheel rim). */
export function applyInterior(interior: InteriorOption, instant = false) {
  config.interior = interior;
  tweenColor(interiorMaterial, interior.color, instant);
  gsap.to(interiorMaterial, {
    roughness: interior.roughness,
    sheen: interior.sheen,
    ...TWEEN,
    duration: instant ? 0 : TWEEN.duration,
  });
}

// Start every material on the default options (duration 0 = set immediately).
tweenLacquer(paintMaterial, config.paint, true);
applyWheels(config.wheels, true);
applyTrim(config.trim, true);
applyInterior(config.interior, true);
