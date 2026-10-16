import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import gsap from "gsap";
import {
  MODEL_MATERIAL_TWEAKS,
  SHARED_BY_MODEL_NAME,
  caliperMaterial,
  dashboardMaterial,
  rimMaterial,
  shadowMaterial,
} from "@/lib/carMaterials";

/*
 * Loads the car (.glb) and prepares it for the configurator.
 *
 * The file was compressed with gltf-transform using "meshopt" (see README), so
 * the loader needs the matching decoder. MeshoptDecoder ships inside Three.js
 * itself: no extra download and no external server.
 */
// The file NAME changes whenever the model changes (v4 = Khronos car, prepared by
// scripts/prepare-model.py): browsers cache /models/* for a week (next.config.ts),
// so a new file under the old name would keep showing the old car.
export const CAR_URL = "/models/volt-one-v4.glb";
const APPROX_FILE_BYTES = 2_560_000; // size of the .glb (only used for the progress bar)
const CAR_LENGTH = 4.7; // meters: the car is scaled to this, whatever units the file was made in

export type CarModel = {
  /** The whole car: centered, nose facing the camera (+z), wheels on the ground (y = 0). */
  root: THREE.Group;
  /** Size of the car in meters (x = width, y = height, z = length). */
  size: THREE.Vector3;
  /** The four wheel groups (for spinning them later). */
  wheels: THREE.Object3D[];
  /** The parts that open. Each one's origin sits exactly on its hinge. */
  hinged: { doorL?: THREE.Object3D; doorR?: THREE.Object3D; frontLid?: THREE.Object3D; rearLid?: THREE.Object3D };
};

const WHEEL_NAMES = ["WheelFrontL", "WheelFrontR", "WheelRearL", "WheelRearR"];

export async function loadCar(onProgress: (fraction: number) => void): Promise<CarModel> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(CAR_URL, (e) => {
    // When the server gzips the file (Vercel does), the browser doesn't know the
    // total size up front (e.total = 0), so fall back to the known file size.
    onProgress(Math.min(0.99, e.loaded / (e.total || APPROX_FILE_BYTES)));
  });
  onProgress(1);

  const model = gltf.scene;

  // ── 1. Swap in our shared materials, matched by the material names in the file ──
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const original = o.material as THREE.MeshStandardMaterial;
    const shared = SHARED_BY_MODEL_NAME[original.name];
    if (!shared) {
      // Not configurable: keep the model's material, just polish it (tires, discs, plastics…).
      const tweak = MODEL_MATERIAL_TWEAKS[original.name];
      if (tweak) {
        if (tweak.color) original.color.set(tweak.color);
        if (tweak.metalness !== undefined) original.metalness = tweak.metalness;
        if (tweak.roughness !== undefined) original.roughness = tweak.roughness;
      }
      return;
    }
    // Keep the model's baked detail: the ambient-occlusion map (soft darkening in
    // panel gaps and creases) and the normal map (fine surface relief).
    if (original.aoMap && !shared.aoMap) {
      shared.aoMap = original.aoMap;
      shared.aoMapIntensity = original.aoMapIntensity;
    }
    if (original.normalMap && !shared.normalMap) {
      shared.normalMap = original.normalMap;
      shared.normalScale.copy(original.normalScale);
    }
    // The dashboard's picture is its glow ("emissive") map: keep it.
    if (shared === dashboardMaterial && original.emissiveMap) shared.emissiveMap = original.emissiveMap;
    shared.side = original.side;
    o.material = shared;
  });

  // ── 2. Real-world size: model files come in any unit (this one is in cm) ──
  model.updateMatrixWorld(true);
  const rawSize = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  model.scale.multiplyScalar(CAR_LENGTH / Math.max(rawSize.x, rawSize.z));

  // ── 3. Face the nose toward +z (the camera's default side): front wheels ahead of the rear ones ──
  model.updateMatrixWorld(true);
  const front = model.getObjectByName("WheelFrontL")?.getWorldPosition(new THREE.Vector3());
  const rear = model.getObjectByName("WheelRearL")?.getWorldPosition(new THREE.Vector3());
  if (front && rear) {
    // Turn the car so its forward direction (rear wheel → front wheel) points along +z.
    // A direction at angle φ = atan2(x, z) from +z is brought onto +z by turning -φ.
    model.rotation.y = -Math.atan2(front.x - rear.x, front.z - rear.z);
  }

  // ── 4. Center it, with the tires touching y = 0 ──
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
  const size = box.getSize(new THREE.Vector3());

  const root = new THREE.Group();
  root.add(model);
  root.updateMatrixWorld(true);

  const wheels = WHEEL_NAMES.map((n) => root.getObjectByName(n)).filter((w): w is THREE.Object3D => Boolean(w));

  // ── 5. Draw the soft contact shadow from the real wheel positions ──
  shadowMaterial.alphaMap = drawContactShadow(size, wheels);
  shadowMaterial.needsUpdate = true;

  // ── 6. Camera anchors in the cabin: the driver's eye + where they look ──
  // Placed from the steering wheel's real position (this car has a central
  // driving seat). They are children of the car, so they turn with it.
  // The wheel is modelled as several pieces (InteriorSteeringWheel01…04), each
  // one only part of the rim: use the box around ALL of them, not just one.
  const steeringBox = new THREE.Box3();
  root.traverse((o) => {
    if (o.name.startsWith("InteriorSteeringWheel")) steeringBox.expandByObject(o);
  });
  if (!steeringBox.isEmpty()) {
    const wheelCenter = steeringBox.getCenter(new THREE.Vector3());
    cabinEye.position.copy(wheelCenter).add(new THREE.Vector3(0, 0.4, -0.42)); // the driver's eyes: above + behind the wheel
    cabinTarget.position.copy(wheelCenter).add(new THREE.Vector3(0, 0.05, 1.6)); // ahead and a little down: display + road
  }
  root.add(cabinEye, cabinTarget);

  const hinged = {
    doorL: root.getObjectByName("DoorL"),
    doorR: root.getObjectByName("DoorR"),
    frontLid: root.getObjectByName("FrontLid"),
    rearLid: root.getObjectByName("RearLid"),
  };

  carSize.copy(size);
  loaded = { wheels: wheels.map(prepareWheel) };
  return { root, size, wheels, hinged };
}

/** Invisible points inside the cabin, for the camera's "sit in the driver's seat" shot (CameraRig.tsx). */
export const cabinEye = new THREE.Object3D();
export const cabinTarget = new THREE.Object3D();

/** The loaded car's size in meters, read by the camera to frame it (CameraRig.tsx). */
export const carSize = new THREE.Vector3(2, 1.3, CAR_LENGTH);

// ─── Wheel roll ─────────────────────────────────────────────────────────────────

type PreparedWheel = { axle: THREE.Vector3; spinning: THREE.Object3D[] };
let loaded: { wheels: PreparedWheel[] } | null = null;
const roll = { angle: 0 };

const usesMaterial = (o: THREE.Object3D, material: THREE.Material) => {
  let found = false;
  o.traverse((c) => {
    if (c instanceof THREE.Mesh && c.material === material) found = true;
  });
  return found;
};

/**
 * Work out, once, how a wheel spins:
 *   - spinning parts: everything in the wheel group except the brake caliper,
 *     which is bolted to the car on a real one too;
 *   - axle: MEASURED from the rim's shape. A rim is round in two directions and
 *     thin in the third, and the thin direction is the axle. This works for any
 *     model, even with steered front wheels, whose axles point a different way.
 */
function prepareWheel(wheel: THREE.Object3D): PreparedWheel {
  const spinning = wheel.children.filter((c) => !usesMaterial(c, caliperMaterial));
  wheel.updateMatrixWorld(true);
  const toWheel = new THREE.Matrix4().copy(wheel.matrixWorld).invert();
  const box = new THREE.Box3();
  wheel.traverse((c) => {
    if (c instanceof THREE.Mesh && c.material === rimMaterial) {
      c.geometry.computeBoundingBox();
      box.union(c.geometry.boundingBox!.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(toWheel, c.matrixWorld)));
    }
  });
  const s = box.getSize(new THREE.Vector3());
  const axle = s.x <= s.y && s.x <= s.z ? new THREE.Vector3(1, 0, 0) : s.y <= s.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
  return { axle, spinning };
}

/** Roll the wheels one full turn: a small "look, new wheels" moment when the wheel option changes. */
export function rollWheels() {
  if (!loaded) return;
  const wheels = loaded.wheels;

  const step = new THREE.Quaternion();
  let previous = 0;
  roll.angle = 0;
  gsap.to(roll, {
    angle: Math.PI * 2,
    duration: 1.1,
    ease: "power2.inOut",
    overwrite: true,
    onUpdate: () => {
      const delta = roll.angle - previous; // rotate by the change since the last frame
      previous = roll.angle;
      for (const { axle, spinning } of wheels) {
        step.setFromAxisAngle(axle, delta);
        for (const part of spinning) {
          part.quaternion.premultiply(step);
          part.position.applyQuaternion(step); // parts sit a hair off-center; keep them on the axle
        }
      }
    },
  });
}

/** How much bigger than the car's footprint the shadow plane is (room for the soft edge). */
export const SHADOW_SCALE = { x: 1.6, z: 1.3 };

/*
 * A blurry footprint drawn on a canvas: a soft rounded rectangle under the body
 * plus a darker spot under each tire (where real contact shadows are densest).
 * White = dark shadow, black = no shadow (it's used as an alpha map).
 */
function drawContactShadow(size: THREE.Vector3, wheels: THREE.Object3D[]) {
  const W = 256;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  const planeW = size.x * SHADOW_SCALE.x;
  const planeL = size.z * SHADOW_SCALE.z;
  // meters → canvas pixels
  const px = (x: number) => (x / planeW + 0.5) * W;
  const pz = (z: number) => (z / planeL + 0.5) * H;

  // Body: many faint, slightly smaller rounded rectangles stacked on top of
  // each other build up a soft gradient edge. (Canvas blur filters aren't
  // supported in every browser, so this works everywhere.)
  const steps = 28;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1); // 0 = biggest/faintest … 1 = smallest
    const w = size.x * (1.12 - 0.3 * t);
    const l = size.z * (1.04 - 0.16 * t);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.beginPath();
    ctx.roundRect(px(-w / 2), pz(-l / 2), (w / planeW) * W, (l / planeL) * H, (w / planeW) * W * 0.35);
    ctx.fill();
  }

  // Tires
  const p = new THREE.Vector3();
  for (const wheel of wheels) {
    wheel.getWorldPosition(p);
    const r = ((size.y * 0.33) / planeW) * W; // ≈ tire radius
    const g = ctx.createRadialGradient(px(p.x), pz(p.z), 0, px(p.x), pz(p.z), r);
    g.addColorStop(0, "rgba(255,255,255,0.75)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(px(p.x) - r, pz(p.z) - r, r * 2, r * 2);
  }

  // The plane lies flat (rotated -90° on x), so the canvas's top edge ends up
  // at -z (the tail) and its bottom edge at +z (the nose), matching pz() above.
  return new THREE.CanvasTexture(canvas);
}
