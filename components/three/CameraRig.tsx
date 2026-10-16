"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CAMERA_STOPS, type Pose } from "@/lib/poses";
import { cabinEye, cabinTarget, carSize } from "./carModel";
import { carTargets } from "@/lib/carState";

const ORBIT_FOV = 34; // lens angle outside the car (degrees): a touch wider than a product lens, for drama
const CABIN_FOV = 60; // inside the cabin: a wider lens, or you only see the steering wheel

/*
 * Moves the camera around the car as you scroll (same pattern as ECLIPSE's
 * Watch.tsx, applied to the camera instead of the object):
 *   - GSAP ScrollTrigger writes the TARGET pose into a ref as you scroll.
 *   - useFrame eases the CURRENT pose toward it every frame (damping), then
 *     places the camera. Scrolling never re-renders React.
 */


export default function CameraRig() {
  const first = CAMERA_STOPS[0].desktop;
  const target = useRef<Pose>({ ...first });
  // Start further away and further round, so the camera glides into the hero
  // shot once the car appears.
  const current = useRef<Pose>({ ...first, az: first.az + 0.6, fill: 0.25 });
  const pointer = useRef({ x: 0, y: 0 });
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const v = useMemo(
    () => ({ orbitPos: new THREE.Vector3(), eye: new THREE.Vector3(), target: new THREE.Vector3() }),
    []
  );

  // Visitors who set "reduce motion" in their OS get no mouse parallax.
  const reducedMotion = useRef(false);
  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Mouse parallax: the camera drifts slightly with the pointer. We listen on
  // window because the canvas has pointer-events: none.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1; // -1 … 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Scroll choreography: identical structure to ECLIPSE.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia(); // different poses per screen size; auto-reverts on resize
    mm.add({ desktop: "(min-width: 861px)", mobile: "(max-width: 860px)" }, (ctx) => {
      const poses = CAMERA_STOPS.map((stop) => (ctx.conditions?.desktop ? stop.desktop : stop.mobile));
      Object.assign(target.current, poses[0]);
      // One tween per camera stop, blending from the previous pose while that
      // block scrolls into view. Each tween starts exactly where the last one
      // ended and the scroll ranges never overlap (every stop is at least one
      // screen tall), so there are no jumps.
      for (let i = 1; i < CAMERA_STOPS.length; i++) {
        gsap.fromTo(target.current, { ...poses[i - 1] }, {
          ...poses[i],
          ease: "power1.inOut",
          immediateRender: false,
          scrollTrigger: { trigger: `#${CAMERA_STOPS[i].id}`, start: "top bottom", end: "top 25%", scrub: true },
        });
      }
    });
    return () => mm.revert();
  }, []);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30); // no snapping after a pause (background tab)
    const camera = state.camera as THREE.PerspectiveCamera;
    const { width: w, height: h } = state.size;
    const t = target.current;
    const c = current.current;
    const still = reducedMotion.current;
    const p = pointer.current;

    // Ease every pose value toward its target (higher = snappier).
    const damp = THREE.MathUtils.damp;
    const SPEED = 3;
    c.az = damp(c.az, t.az + (still ? 0 : p.x * 0.06), SPEED, delta);
    c.el = damp(c.el, t.el + (still ? 0 : p.y * 0.025), SPEED, delta);
    c.fill = damp(c.fill, t.fill, SPEED, delta);
    c.x = damp(c.x, t.x, SPEED, delta);
    c.y = damp(c.y, t.y, SPEED, delta);
    // In the cabin: from the scroll story (the interior stop) or the configurator's Interior tab.
    c.cabin = damp(c.cabin, Math.max(t.cabin, carTargets().cabin), 2.2, delta);

    // How wide the car looks from this angle: side-on you see its length,
    // nose-on you see its width, and in between a mix of both. carSize is the
    // loaded model's real size, so any car is framed the same way.
    const span = Math.abs(carSize.z * Math.sin(c.az)) + Math.abs(carSize.x * 0.9 * Math.cos(c.az));
    const lookHeight = carSize.y * 0.5; // aim at the middle of the car's height, not the floor
    lookAt.set(0, lookHeight, 0);
    // Distance at which that span fills `fill` of the screen width.
    const tanHalfWidth = Math.tan(THREE.MathUtils.degToRad(ORBIT_FOV / 2)) * (w / h);
    const distance = span / 2 / (tanHalfWidth * c.fill);

    // Place the camera on a sphere around the car, looking at its middle.
    const orbitPos = v.orbitPos.set(
      Math.sin(c.az) * Math.cos(c.el) * distance,
      lookHeight + Math.sin(c.el) * distance,
      Math.cos(c.az) * Math.cos(c.el) * distance
    );

    // Blend toward the driver's seat (cabin 0 = outside … 1 = inside). The
    // anchors are children of the car (carModel.ts), so they follow it when the
    // turntable spins. The path runs from the orbit position straight into the
    // cabin, i.e. through the open door when the camera starts beside the car.
    const k = c.cabin * c.cabin * (3 - 2 * c.cabin); // smoothstep: gentle start and finish
    cabinEye.getWorldPosition(v.eye);
    cabinTarget.getWorldPosition(v.target);
    camera.position.lerpVectors(orbitPos, v.eye, k);
    lookAt.lerp(v.target, k);
    camera.lookAt(lookAt);
    camera.fov = THREE.MathUtils.lerp(ORBIT_FOV, CABIN_FOV, k);

    // Shift the car left/right/up on screen WITHOUT turning the camera (which
    // would change the perspective): render the frame as if the picture were
    // slid sideways inside a bigger one. (This also applies the new fov.)
    camera.setViewOffset(w, h, -c.x * w, c.y * h, w, h);
  });

  return null;
}
