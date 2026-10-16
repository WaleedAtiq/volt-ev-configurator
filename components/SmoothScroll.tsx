"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
 * Lenis = smooth scrolling. A mouse wheel normally jumps the page in steps of
 * about 100px. Lenis turns each step into a short glide, which is what makes
 * the 3D car move fluidly instead of stuttering.
 *
 * The important part is the wiring. Lenis and GSAP ScrollTrigger must share
 * ONE clock. If each ran its own requestAnimationFrame loop, they would
 * occasionally disagree about the scroll position for a frame, and you'd see
 * the car "jump". So:
 *   1. GSAP's ticker drives Lenis (lenis.raf inside gsap.ticker).
 *   2. Every Lenis scroll tells ScrollTrigger to update immediately.
 */
export default function SmoothScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Respect the OS "reduce motion" setting: keep native scrolling.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.1, // 0–1: lower = floatier, higher = tighter
      autoRaf: false, // we drive it from GSAP's ticker below
      anchors: { offset: -72 }, // smooth-scroll nav links (#design…), minus the nav height
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000); // GSAP gives seconds, Lenis wants ms
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0); // never "skip ahead" after a slow frame (prevents jumps)

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
