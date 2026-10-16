"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
 * Page-wide scroll effects for the HTML content (not the 3D car):
 *   .reveal       → fades + slides up when it enters the screen
 *   [data-count]  → number counts up from 0 when it enters the screen
 *
 * These use GSAP ScrollTrigger as well, so every scroll animation on the page
 * runs on the same clock as Lenis (see SmoothScroll.tsx).
 */
export default function ScrollEffects() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // "Reduce motion" turned on in the OS: show everything immediately, with no
    // fades and no counting (the real numbers are already in the HTML).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // gsap.context() records every animation created inside it, so one
    // ctx.revert() cleans them all up when the component unmounts.
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const end = Number(el.dataset.count);
        const decimals = Number(el.dataset.decimals ?? 0); // e.g. 1 for "2.9"
        const format = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        const counter = { value: 0 };
        el.textContent = format(0);
        gsap.to(counter, {
          value: end,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: () => {
            el.textContent = format(counter.value);
          },
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return null;
}
