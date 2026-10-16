import * as THREE from "three";
import gsap from "gsap";
import type { EnvironmentId } from "@/lib/paints";
import { shadowMaterial } from "@/lib/carMaterials";

/*
 * ─── THE THREE WORLDS: STUDIO / NIGHT / OUTDOOR ───────────────────────────────
 *
 * A glossy car has very little color of its own on screen. Most of what you see
 * is a mirror image of its surroundings. So "changing the environment" really
 * means changing four things together:
 *
 *   1. REFLECTIONS. An environment map: a 360° picture the car's paint, glass
 *      and chrome reflect. We build each one in code from a tiny invisible scene
 *      (softboxes for the studio, neon tubes for night, a dusk sky + sun for
 *      outdoor) and let Three.js "photograph" it. 0 KB to download, versus
 *      several MB for a photo-based .hdr file.
 *   2. BACKDROP + GROUND. The visible sky dome and the floor the car stands on.
 *   3. LIGHTS. A key light plus two rim lights, and a headlight beam at night.
 *   4. EXPOSURE. The camera brightness, like a photographer adjusting for the scene.
 *
 * Like the materials, every object here is created ONCE outside React, and
 * applyEnvironment() tweens them with GSAP, so switching never re-renders React.
 */

type Light = { color: string; intensity: number; position: [number, number, number] };

type Preset = {
  sky: { top: string; horizon: string; bottom: string }; // visible backdrop gradient
  ground: { color: string; roughness: number; shine: number }; // shine = how much the floor reflects (lights + env), 0–1
  key: Light; // main light (the "sun" outdoors)
  rimA: Light; // left rim light (cyan neon at night)
  rimB: Light; // right rim light (violet neon at night)
  beam: number; // headlight beam on the ground, when the headlights are on
  headlights: number; // headlight glow strength, when on
  taillights: number; // tail-light glow strength, when on
  shadow: number; // contact-shadow darkness
  exposure: number;
};

export const PRESETS: Record<EnvironmentId, Preset> = {
  studio: {
    sky: { top: "#121418", horizon: "#30333b", bottom: "#24262c" },
    ground: { color: "#131418", roughness: 0.75, shine: 0.3 },
    key: { color: "#ffffff", intensity: 1.2, position: [4, 8, 6] },
    rimA: { color: "#ffffff", intensity: 0, position: [-6, 3, -4] },
    rimB: { color: "#ffffff", intensity: 0, position: [6, 3, -4] },
    beam: 6,
    headlights: 2.5,
    taillights: 1.8,
    shadow: 0.85,
    exposure: 1,
  },
  night: {
    sky: { top: "#020308", horizon: "#0c1330", bottom: "#040509" },
    // Low roughness + a little metalness = the "wet asphalt" sheen that
    // picks up the neon colors from the environment map.
    // Fairly smooth = the "wet asphalt" sheen. Low shine keeps the (very bright)
    // neon to a hint in the floor instead of flooding it with color.
    ground: { color: "#07080b", roughness: 0.45, shine: 0.1 },
    key: { color: "#8fa6ff", intensity: 0.35, position: [-3, 8, 4] },
    rimA: { color: "#3dd9ff", intensity: 45, position: [-5, 2.6, -4] },
    rimB: { color: "#b04dff", intensity: 45, position: [5, 2.6, -4.5] },
    beam: 25,
    headlights: 10,
    taillights: 6,
    shadow: 0.9,
    exposure: 1.1,
  },
  outdoor: {
    sky: { top: "#22356b", horizon: "#e09366", bottom: "#33292a" },
    // Some shine, so the low sun glints off the road surface toward the camera.
    ground: { color: "#4a3f39", roughness: 0.8, shine: 0.3 },
    // Low warm sun behind the car on the left: golden rim light along the body.
    key: { color: "#ffb57d", intensity: 3.5, position: [-8, 3, -6] },
    rimA: { color: "#7fa4ff", intensity: 25, position: [6, 4, 6] }, // cool sky fill from the front
    rimB: { color: "#ffcf9e", intensity: 0, position: [6, 2, -6] },
    beam: 8,
    headlights: 3,
    taillights: 2.2,
    shadow: 0.7,
    exposure: 1.1,
  },
};

// ─── Shared scene objects (added to the scene by Experience.tsx / Car.tsx) ──────

/** Sky gradient on the inside of a big sphere. Also reused inside the env maps. */
function createSkyMaterial(top: string, horizon: string, bottom: string) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, // we're inside the sphere, looking at its inner surface
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(top) },
      uHorizon: { value: new THREE.Color(horizon) },
      uBottom: { value: new THREE.Color(bottom) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position); // direction from the center = where on the sky we are
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon, uBottom;
      varying vec3 vDir;
      void main() {
        float h = normalize(vDir).y; // -1 straight down … 0 horizon … 1 straight up
        // The top color takes over within ~10° of the horizon. The camera sits
        // at eye level, so the top of the screen is only a few degrees up: a
        // slower gradient would never show the top color at all.
        vec3 sky = mix(uHorizon, uTop, smoothstep(0.0, 0.18, h));
        vec3 below = mix(uHorizon, uBottom, smoothstep(0.0, 0.12, -h));
        gl_FragColor = vec4(h > 0.0 ? sky : below, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

const s = PRESETS.studio;
export const skyMaterial = createSkyMaterial(s.sky.top, s.sky.horizon, s.sky.bottom);
export const backdrop = new THREE.Mesh(new THREE.SphereGeometry(90, 48, 24), skyMaterial);
backdrop.renderOrder = -2; // always drawn first, behind everything

/**
 * The floor. It fades out toward the edges (alphaMap = a radial gradient), so
 * it blends into the sky with no visible edge, like a seamless studio cyclorama.
 *
 * Why a "physical" material: seen from a low camera angle, any floor turns
 * mirror-like (the Fresnel effect: a road looks shiny far ahead of you) and
 * picks up big glare spots from the lights. specularIntensity scales ALL of
 * that shine (from the lights and from the environment map) in one number, so
 * a dark website can keep a dark floor.
 */
export const groundMaterial = new THREE.MeshPhysicalMaterial({
  color: s.ground.color,
  roughness: s.ground.roughness,
  metalness: 0,
  specularIntensity: s.ground.shine,
  transparent: true,
  depthWrite: false,
  alphaMap: createRadialFade(),
});
export const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.renderOrder = -1;

/*
 * The lights. All four always exist, even when an environment turns one down
 * to 0. Adding or removing a light changes the shader programs (= recompile
 * stutter), while changing an intensity is free.
 */
export const keyLight = new THREE.DirectionalLight(s.key.color, s.key.intensity);
keyLight.position.set(...s.key.position);
export const rimLightA = new THREE.PointLight(s.rimA.color, s.rimA.intensity);
rimLightA.position.set(...s.rimA.position);
export const rimLightB = new THREE.PointLight(s.rimB.color, s.rimB.intensity);
rimLightB.position.set(...s.rimB.position);
/** Headlight beam: a spotlight on the car's nose, lighting the ground ahead (Car.tsx places it). */
export const headlightBeam = new THREE.SpotLight("#e6efff", 0, 25, 0.75, 1, 1.6); // color, intensity, range, cone angle, soft edge, falloff

/**
 * How bright the car's lights are WHEN ON in the current environment (dim in the
 * studio, full beam at night). Car.tsx multiplies these by on/off every frame,
 * because the scroll story and the toggles switch the lights on and off.
 */
export const lightLevels = {
  beam: PRESETS.studio.beam,
  headlights: PRESETS.studio.headlights,
  taillights: PRESETS.studio.taillights,
  /** Camera exposure. Car.tsx applies it every frame, so the story can dim the scene. */
  exposure: PRESETS.studio.exposure,
};

// ─── Environment maps ───────────────────────────────────────────────────────────

/** A glowing rectangle (softbox / neon tube / sun) in an env scene, facing the car. */
function addPanel(
  scene: THREE.Scene,
  w: number,
  h: number,
  position: [number, number, number],
  intensity: number,
  color = "#ffffff"
) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    // Brighter than white (intensity > 1) so the reflection is a true highlight.
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
      toneMapped: false,
    })
  );
  mesh.position.set(...position);
  mesh.lookAt(0, 0, 0);
  scene.add(mesh);
  return mesh;
}

/** The floor of an env scene. The capture point is the car's middle, so the floor sits below it. */
function addFloor(scene: THREE.Scene, color: string) {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({ color }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.6;
  scene.add(floor);
}

function addSky(scene: THREE.Scene, top: string, horizon: string, bottom: string) {
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), createSkyMaterial(top, horizon, bottom)));
}

/*
 * STUDIO: how cars are shot for brochures. A long overhead softbox draws the
 * bright line along the roof and shoulders, and two long horizontal strip
 * lights draw the "speed lines" along the doors. The light-grey floor puts a
 * soft horizon line low on the doors, which instantly reads as "real car".
 */
function buildStudio(scene: THREE.Scene) {
  addSky(scene, "#16181d", "#2e3138", "#2e3138");
  addFloor(scene, "#4a4d55");
  // Why so bright: car clear-coat only reflects ~4% of the light that hits it
  // head-on (bare metal reflects nearly all of it). Real car studios use very
  // strong strip lights for the same reason.
  addPanel(scene, 4, 12, [0, 8, 0], 12); // overhead softbox, long along the car
  addPanel(scene, 12, 0.5, [-7, 1.6, 0], 16); // left strip light (horizontal)
  addPanel(scene, 12, 0.5, [7, 1.2, 0], 14); // right strip light
  addPanel(scene, 12, 0.3, [7, 3.2, 1], 8); // second, higher right strip: double "speed line"
  addPanel(scene, 5, 3, [0, 3, 9], 4); // front softbox
  addPanel(scene, 5, 3, [0, 3, -9], 3); // rear softbox
  addPanel(scene, 3, 3, [-6, 4, 6], 3, "#cfe0ff"); // cool corner fill
}

/*
 * NIGHT: almost black, so the few lights that exist become the whole look.
 * Two long neon tubes (cyan left, violet right) wrap the body in colored rim
 * light, and a ring of tiny "city lights" in the distance shows up as
 * sparkling dots in the paint.
 */
function buildNight(scene: THREE.Scene) {
  addSky(scene, "#010205", "#0a1028", "#020306");
  addFloor(scene, "#050609");
  addPanel(scene, 14, 0.25, [-7, 0.9, -1], 30, "#3dd9ff"); // cyan neon tube
  addPanel(scene, 14, 0.25, [7, 1.1, -1.5], 30, "#b04dff"); // violet neon tube
  addPanel(scene, 10, 0.2, [0, 6, -6], 10, "#3dd9ff"); // overhead accent
  addPanel(scene, 3, 6, [0, 7, 2], 1.2, "#8fa6ff"); // faint moonlit overhead
  // Distant city lights. A seeded pattern (not Math.random) so it looks the same every visit.
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.08;
    const y = -0.2 + ((Math.sin(i * 78.233) + 1) / 2) * 2.5;
    const warm = i % 3 === 0;
    addPanel(scene, 0.35, 0.35, [Math.cos(a) * 24, y, Math.sin(a) * 24], 20, warm ? "#ffc27a" : "#e6f0ff");
  }
}

/*
 * OUTDOOR: golden-hour dusk. A gradient sky (deep blue overhead, warm peach at
 * the horizon), warm earth below it, and a bright low sun behind the car.
 * The sun sits in the same direction as the outdoor key light, so the
 * reflection and the lighting agree.
 */
function buildOutdoor(scene: THREE.Scene) {
  addSky(scene, "#24376e", "#ffb27a", "#3b2f27");
  addFloor(scene, "#4a3c33");
  const sunDir = new THREE.Vector3(...PRESETS.outdoor.key.position).normalize();
  addPanel(scene, 3, 3, sunDir.clone().multiplyScalar(30).toArray(), 120, "#ffd9ad"); // the sun
  addPanel(scene, 30, 2.5, [0, 1.5, -28], 2.5, "#ffb27a"); // glow band along the far horizon
}

/** Photograph a builder's scene into an environment map, then free the scene. */
function captureEnvironment(pmrem: THREE.PMREMGenerator, build: (scene: THREE.Scene) => void) {
  const scene = new THREE.Scene();
  build(scene);
  const texture = pmrem.fromScene(scene, 0.02).texture;
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  return texture;
}

// ─── Switching ──────────────────────────────────────────────────────────────────

/** What the environment switch needs to reach. Filled in by initEnvironments(). */
const stage = {
  renderer: null as THREE.WebGLRenderer | null,
  scene: null as THREE.Scene | null,
  maps: null as Record<EnvironmentId, THREE.Texture> | null,
  /** The chosen environment, remembered even if it is picked before the 3D has loaded. */
  current: "studio" as EnvironmentId,
};

/**
 * Build all three environment maps up front (a few milliseconds each), so
 * switching later is instant. Called once by Experience.tsx; returns a cleanup.
 */
export function initEnvironments(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const maps = {
    studio: captureEnvironment(pmrem, buildStudio),
    night: captureEnvironment(pmrem, buildNight),
    outdoor: captureEnvironment(pmrem, buildOutdoor),
  };
  pmrem.dispose();

  Object.assign(stage, { renderer, scene, maps });
  applyEnvironment(stage.current, true);

  return () => {
    scene.environment = null;
    Object.values(maps).forEach((t) => t.dispose());
    Object.assign(stage, { renderer: null, scene: null, maps: null });
  };
}

/**
 * Switch to an environment with a smooth transition.
 * Called straight from the configurator's click handler, like applyPaint().
 *
 * An environment map is a picture, and two pictures can't be blended on the
 * car without extra rendering work. So the reflections do a quick "dip": they
 * dim for a third of a second, the map is swapped while they're dark, and they
 * come back up in the new world. Everything else (sky, ground, lights,
 * exposure, headlights) blends continuously over the same second, so it reads
 * as one smooth change, like showroom lights changing scene.
 */
export function applyEnvironment(id: EnvironmentId, instant = false) {
  stage.current = id;
  const { renderer, scene, maps } = stage;
  if (!renderer || !scene || !maps) return; // 3D not ready yet: applied once it is

  const p = PRESETS[id];
  const duration = instant ? 0 : 1.1;
  const ease = "power2.inOut";

  // 1. Reflections: dip → swap → rise.
  if (instant) {
    scene.environment = maps[id];
    scene.environmentIntensity = 1;
  } else {
    gsap.to(scene, {
      environmentIntensity: 0.15,
      duration: 0.35,
      ease: "power2.in",
      overwrite: true,
      onComplete: () => {
        scene.environment = maps[id];
        gsap.to(scene, { environmentIntensity: 1, duration: 0.75, ease: "power2.out", overwrite: true });
      },
    });
  }

  // 2. Backdrop + ground.
  const u = skyMaterial.uniforms;
  tweenColor(u.uTop.value, p.sky.top, duration, ease);
  tweenColor(u.uHorizon.value, p.sky.horizon, duration, ease);
  tweenColor(u.uBottom.value, p.sky.bottom, duration, ease);
  tweenColor(groundMaterial.color, p.ground.color, duration, ease);
  gsap.to(groundMaterial, { roughness: p.ground.roughness, specularIntensity: p.ground.shine, duration, ease, overwrite: true });

  // 3. Lights.
  tweenLight(keyLight, p.key, duration, ease);
  tweenLight(rimLightA, p.rimA, duration, ease);
  tweenLight(rimLightB, p.rimB, duration, ease);
  gsap.to(lightLevels, {
    beam: p.beam,
    headlights: p.headlights,
    taillights: p.taillights,
    exposure: p.exposure,
    duration,
    ease,
    overwrite: true,
  });
  gsap.to(shadowMaterial, { opacity: p.shadow, duration, ease, overwrite: true });

  // 4. Exposure: tweened in lightLevels above; Car.tsx applies it to the renderer
  //    every frame (times the story's "ambient" dimmer).
}

function tweenColor(color: THREE.Color, hex: string, duration: number, ease: string) {
  const c = new THREE.Color(hex);
  gsap.to(color, { r: c.r, g: c.g, b: c.b, duration, ease, overwrite: true });
}

function tweenLight(light: THREE.DirectionalLight | THREE.PointLight, to: Light, duration: number, ease: string) {
  tweenColor(light.color, to.color, duration, ease);
  gsap.to(light, { intensity: to.intensity, duration, ease, overwrite: true });
  const [x, y, z] = to.position;
  gsap.to(light.position, { x, y, z, duration, ease, overwrite: true });
}

/** White in the middle → black at the edge. Used as the ground's alphaMap. */
function createRadialFade() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.18, "#fff"); // solid floor around the car
  g.addColorStop(1, "#000"); // fully faded at the edge
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}
