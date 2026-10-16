"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";
import {
  dashboardMaterial,
  headlightMaterial,
  shadowMaterial,
  signalMaterial,
  taillightMaterial,
} from "@/lib/carMaterials";
import { carSpin } from "@/lib/carInteraction";
import { carTargets, resetToggles } from "@/lib/carState";
import { headlightBeam, lightLevels } from "./environments";
import { SHADOW_SCALE, type CarModel } from "./carModel";
import { createStory } from "./story";

const TURN = Math.PI * 2;
const IDLE_DELAY = 3.5; // seconds untouched before the turntable starts spinning by itself
const IDLE_SPEED = 0.18; // radians/second ≈ one full turn every 35 s: slow, showroom-like

/*
 * How far each part opens, in radians (1 rad ≈ 57°), around its hinge.
 * The axes are the model's own: x = across the car, z = up.
 *   lift  → rotation around x (raises the part)
 *   swing → rotation around z (swings it outward a little, so it clears the body)
 * Doors are "scissor" doors: hinged at the front, they rise up and slightly out.
 */
const HINGES = {
  doorL: { lift: 1.15, swing: -0.14 },
  doorR: { lift: 1.15, swing: 0.14 },
  frontLid: { lift: 0.7, swing: 0 },
  rearLid: { lift: -0.8, swing: 0 },
};

/*
 * The car as it appears in the scene: the loaded model, its soft contact
 * shadow, and the headlight beam. They sit on one "turntable" group, so
 * drag-to-rotate turns all three together.
 *
 * Every frame it also eases the doors, lids and lights toward what the scroll
 * story + configurator toggles ask for (lib/carState.ts), the same "target +
 * damping" pattern as the camera.
 *
 * dispose={null}: by default React Three Fiber frees (disposes) objects when a
 * component unmounts. These objects and their materials are shared and
 * long-lived (lib/carMaterials.ts), so we tell it to leave them alone.
 */
export default function Car({ model }: { model: CarModel }) {
  const turntable = useRef<THREE.Group>(null!);
  const autoSpeed = useRef(0); // current idle-spin speed (eases in and out)
  // What the car is doing right now (eased toward the targets every frame).
  const now = useRef({ doors: 0, frontLid: 0, rearLid: 0, headlights: 1, taillights: 1, brake: 0, screen: 0, hazard: 0, ambient: 1 });
  const nose = model.size.z / 2;

  // Visitors who set "reduce motion" in their OS get no idle auto-spin.
  const reducedMotion = useRef(false);
  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // The scroll story (doors, lids, lights): see story.ts.
  useEffect(() => createStory(), []);

  // The turntable and the "Try it" toggles are only "on" in the configurator.
  // Leaving it closes everything the visitor opened, so the story starts clean.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const trigger = ScrollTrigger.create({
      trigger: "#configure",
      start: "top 60%",
      end: "bottom 40%",
      onToggle: (self) => {
        carSpin.active = self.isActive;
        carSpin.idle = 0;
        if (!self.isActive) resetToggles();
      },
    });
    return () => trigger.kill();
  }, []);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30); // no snapping after a pause (background tab)
    const damp = THREE.MathUtils.damp;
    const lerp = THREE.MathUtils.lerp;

    // ── Turntable (drag + flick + idle spin) ──
    const s = carSpin;
    const t = turntable.current;
    if (!s.dragging) {
      // Flick inertia: keep spinning after release, slowing down.
      s.offset += s.velocity * delta;
      s.velocity = damp(s.velocity, 0, 3, delta);
      s.idle += delta;

      // Idle auto-spin: ease the speed up after a few seconds untouched.
      const wantSpin = s.active && s.idle > IDLE_DELAY && !reducedMotion.current;
      autoSpeed.current = damp(autoSpeed.current, wantSpin ? IDLE_SPEED : 0, 1.5, delta);
      s.offset += autoSpeed.current * delta;

      // Scrolled away from the configurator: return home the SHORT way. Removing
      // whole turns from both the target and the current angle looks identical
      // (360° = 0°), so there's no jump, and it never unwinds several turns.
      if (!s.active && Math.abs(s.velocity) < 0.5) {
        const fullTurns = Math.round(s.offset / TURN) * TURN;
        s.offset -= fullTurns;
        t.rotation.y -= fullTurns;
        s.offset = damp(s.offset, 0, 2, delta);
      }
    } else {
      s.idle = 0;
      autoSpeed.current = 0;
    }
    t.rotation.y = damp(t.rotation.y, s.offset, 8, delta);

    // ── Doors + lids: ease toward their targets (slow and smooth, like hydraulics) ──
    const target = carTargets();
    const n = now.current;
    const doorsBefore = n.doors;
    n.doors = damp(n.doors, target.doors, 3.5, delta);
    n.frontLid = damp(n.frontLid, target.frontLid, 3.5, delta);
    n.rearLid = damp(n.rearLid, target.rearLid, 3.5, delta);
    const open = (part: THREE.Object3D | undefined, hinge: { lift: number; swing: number }, amount: number) => {
      // smoothstep: starts and ends gently, so the part "settles" into place
      const e = amount * amount * (3 - 2 * amount);
      part?.rotation.set(hinge.lift * e, 0, hinge.swing * e);
    };
    const { doorL, doorR, frontLid, rearLid } = model.hinged;
    open(doorL, HINGES.doorL, n.doors);
    open(doorR, HINGES.doorR, n.doors);
    open(frontLid, HINGES.frontLid, n.frontLid);
    open(rearLid, HINGES.rearLid, n.rearLid);

    // ── Lights: quick to react (a light switch, not a hinge) ──
    n.headlights = damp(n.headlights, target.headlights, 18, delta);
    n.taillights = damp(n.taillights, target.taillights, 18, delta);
    n.brake = damp(n.brake, target.brake, 25, delta);
    n.screen = damp(n.screen, target.screen, 6, delta);
    // Scene brightness: the environment's exposure × the story's dimmer.
    n.ambient = damp(n.ambient, target.ambient, 10, delta);
    state.gl.toneMappingExposure = lightLevels.exposure * n.ambient;
    // Exposure darkens EVERYTHING, lights included. Dividing the lights by the
    // dimmer keeps them at full strength while the room around them goes dark.
    const glow = 1 / n.ambient;
    const lv = lightLevels; // how bright "on" is in this environment (environments.ts)
    headlightMaterial.emissiveIntensity = lerp(0.03, lv.headlights, n.headlights) * glow;
    headlightBeam.intensity = lv.beam * n.headlights * glow;
    taillightMaterial.emissiveIntensity = (lerp(0.05, lv.taillights, n.taillights) + n.brake * 5) * glow;
    dashboardMaterial.emissiveIntensity = n.screen * 1.4 * glow;

    // Hazard lights blink while the doors are moving (like a real car unlocking).
    const doorsMoving = Math.abs(n.doors - doorsBefore) > 0.0005;
    const blink = doorsMoving && Math.sin(state.clock.elapsedTime * Math.PI * 2 * 1.5) > 0 ? 1 : 0;
    n.hazard = damp(n.hazard, blink, 20, delta);
    signalMaterial.emissiveIntensity = n.hazard * 4 * glow;
  });

  return (
    <group ref={turntable}>
      <primitive object={model.root} dispose={null} />

      {/* Contact shadow, a hair above the ground so the two never flicker */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.005} material={shadowMaterial} renderOrder={1} dispose={null}>
        <planeGeometry args={[model.size.x * SHADOW_SCALE.x, model.size.z * SHADOW_SCALE.z]} />
      </mesh>

      {/* Headlight beam: from the nose, aimed down the road ahead */}
      <primitive object={headlightBeam} position={[0, 0.7, nose - 0.2]} dispose={null} />
      <primitive object={headlightBeam.target} position={[0, 0, nose + 8]} dispose={null} />
    </group>
  );
}
