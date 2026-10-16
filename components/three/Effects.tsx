"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/*
 * ─── GLOW ("BLOOM") ────────────────────────────────────────────────────────────
 *
 * Instead of drawing straight to the screen, the scene is drawn into an
 * off-screen HDR image (it can hold "brighter than white" values), and then:
 *   1. RenderPass       draws the scene into it;
 *   2. UnrealBloomPass  picks the pixels brighter than THRESHOLD (the lights,
 *                       the dashboard screen, sharp glints on chrome), blurs
 *                       them and adds them back on top: a soft glow;
 *   3. OutputPass       applies tone mapping + color conversion for the screen
 *                       (what the renderer normally does by itself).
 *
 * It all comes from Three.js's own examples folder: no extra library.
 * It costs GPU time, so AdaptiveQuality (Experience.tsx) switches the bloom
 * off on devices that can't keep up (quality.bloom = false).
 */
const STRENGTH = 0.55; // how strong the glow is
const RADIUS = 0.45; // how far it spreads (0–1)
const THRESHOLD = 1.6; // only pixels brighter than this glow (1 = white): lights, not paint

/** Switches read by Effects every frame (written by AdaptiveQuality). */
export const quality = { bloom: true };

/**
 * The off-screen image the scene is drawn into. ShaderWarmup compiles the
 * shaders against it: shaders for "draw to screen" and "draw off-screen"
 * differ, and compiling the wrong ones would cause a stutter on the first frame.
 */
export const effects = { target: null as THREE.WebGLRenderTarget | null };

export default function Effects() {
  const { gl, scene, camera, size } = useThree();
  const dpr = useThree((s) => s.viewport.dpr);
  const fx = useRef<{ composer: EffectComposer; bloom: UnrealBloomPass } | null>(null);

  // Build the passes once (in an effect: creating GPU objects is a side effect).
  useEffect(() => {
    // samples: 4 = anti-aliasing for the off-screen image (otherwise edges go jagged).
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(gl, target);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), STRENGTH, RADIUS, THRESHOLD);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    // Start at the canvas's current size (the next effect keeps it in sync).
    const canvasSize = gl.getSize(new THREE.Vector2());
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(canvasSize.x, canvasSize.y);
    fx.current = { composer, bloom };
    effects.target = target;
    return () => {
      bloom.dispose();
      composer.dispose();
      fx.current = null;
      effects.target = null;
    };
  }, [gl, scene, camera]);

  // Match the canvas size and pixel ratio (which AdaptiveQuality may lower).
  useEffect(() => {
    fx.current?.composer.setPixelRatio(dpr);
    fx.current?.composer.setSize(size.width, size.height);
  }, [dpr, size]);

  // Priority 1: React Three Fiber stops drawing the scene itself and lets this
  // draw each frame instead (after every other useFrame has updated the scene).
  useFrame((_, delta) => {
    const f = fx.current;
    if (!f) return;
    f.bloom.enabled = quality.bloom;
    f.composer.render(delta);
  }, 1);

  return null;
}
