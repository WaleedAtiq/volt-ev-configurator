"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Car from "./Car";
import CameraRig from "./CameraRig";
import Effects, { effects, quality } from "./Effects";
import { loadCar, type CarModel } from "./carModel";
import { initEnvironments, backdrop, ground, keyLight, rimLightA, rimLightB } from "./environments";
import { setLoadProgress, setSceneReady } from "@/lib/loadProgress";

/*
 * The 3D layer. One full-screen <canvas> fixed BEHIND the page; the HTML
 * sections scroll on top of it, and the camera moves around the car to match.
 * (One canvas for the whole page = one WebGL context and one render loop,
 * which is much lighter on phones than a canvas per section.)
 */
export default function Experience() {
  // Phones/tablets get a lower pixel-ratio cap: dense screens, weaker GPUs.
  const maxDpr = window.matchMedia("(pointer: coarse)").matches ? 1.5 : 1.75;

  // Don't draw a single frame until every shader is compiled (ShaderWarmup).
  const [compiled, setCompiled] = useState(false);
  const markCompiled = useCallback(() => {
    setCompiled(true);
    setSceneReady();
  }, []);

  // Download + prepare the car (components/three/carModel.ts).
  const [car, setCar] = useState<CarModel | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadCar(setLoadProgress)
      .then((m) => !cancelled && setCar(m))
      .catch((err) => {
        console.error("VOLT: car model failed to load", err);
        document.documentElement.classList.add("no-3d"); // show the static fallback instead
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        dpr={[1, maxDpr]}
        frameloop={compiled ? "always" : "never"}
        camera={{ position: [6, 2, 9], fov: 30, near: 0.1, far: 300 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          // "Neutral" tone mapping (Khronos PBR Neutral) was designed for product
          // renders: it keeps colors true, so the car matches its paint swatch.
          gl.toneMapping = THREE.NeutralToneMapping;
        }}
      >
        <World />
        <CameraRig />
        <AdaptiveQuality />
        <Effects />
        {car && (
          <>
            <Car model={car} />
            <ShaderWarmup onDone={markCompiled} />
          </>
        )}
      </Canvas>
    </div>
  );
}

/** Sky, ground, lights and reflections (all from environments.ts). */
function World() {
  const { gl, scene } = useThree();
  useEffect(() => initEnvironments(gl, scene), [gl, scene]); // returns its own cleanup

  return (
    <>
      <primitive object={backdrop} dispose={null} />
      <primitive object={ground} dispose={null} />
      <primitive object={keyLight} dispose={null} />
      <primitive object={rimLightA} dispose={null} />
      <primitive object={rimLightB} dispose={null} />
    </>
  );
}

/**
 * Safety net for slow devices (same as ECLIPSE): if the real frame rate stays
 * below 45 fps, render at 1× pixel ratio (roughly half the pixels on a retina
 * screen) and switch the glow off. The first 3 seconds are ignored (still
 * loading/compiling).
 */
function AdaptiveQuality() {
  const setDpr = useThree((state) => state.setDpr);
  const stats = useRef({ elapsed: 0, time: 0, frames: 0, lowered: false });

  useFrame((_, delta) => {
    const s = stats.current;
    if (s.lowered) return;
    s.elapsed += delta;
    if (s.elapsed < 3) return;
    s.time += delta;
    s.frames += 1;
    if (s.time >= 2) {
      if (s.frames / s.time < 45) {
        setDpr(1);
        quality.bloom = false;
        s.lowered = true;
      }
      s.time = 0;
      s.frames = 0;
    }
  });

  return null;
}

/**
 * Compile every shader in the background before the first frame (same as
 * ECLIPSE), so the page never freezes while the GPU programs are built.
 */
function ShaderWarmup({ onDone }: { onDone: () => void }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    let cancelled = false;
    // Compile for the off-screen image the glow effect draws into (Effects.tsx):
    // that's where the scene is really drawn, and its shaders differ slightly.
    gl.setRenderTarget(effects.target);
    const compiling = gl.compileAsync(scene, camera);
    gl.setRenderTarget(null);
    compiling.then(() => {
      if (!cancelled) onDone();
    });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, onDone]);

  return null;
}
