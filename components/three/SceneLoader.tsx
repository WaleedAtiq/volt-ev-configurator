"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Three.js needs a real browser (WebGL, window, canvas), so it can't render on
// the server. `ssr: false` loads the 3D code only in the browser, as a separate
// JavaScript chunk, so the page's text appears before Three.js has downloaded.
//
// (Next.js only allows `ssr: false` inside a "use client" file, which is why this
// small wrapper exists.)
const Experience = dynamic(() => import("./Experience"), { ssr: false });

/*
 * Decides IF and WHEN to start the 3D:
 *
 * 1. IF: some devices have no hardware graphics acceleration (old laptops,
 *    locked-down office PCs, some servers). There, WebGL is emulated on the CPU
 *    and the 3D would crawl at a few frames per second. The browser can tell us:
 *    `failIfMajorPerformanceCaveat: true` refuses to create a WebGL context when
 *    it would be that slow. Those visitors get a static image of the car
 *    instead (the `no-3d` class shows it; see .car-poster in globals.css).
 *
 * 2. WHEN: after the page has painted and the browser is idle, so the 3D set-up
 *    never delays the text appearing (good for users, and for Lighthouse's LCP).
 */
export default function SceneLoader() {
  const [start, setStart] = useState(false);

  useEffect(() => {
    const probe = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!probe) {
      document.documentElement.classList.add("no-3d");
      return;
    }
    probe.getExtension("WEBGL_lose_context")?.loseContext(); // free the test context right away

    // requestIdleCallback = "run this when you have nothing better to do".
    // Safari doesn't support it yet, so it falls back to a short timeout.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setStart(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setStart(true), 300);
    return () => window.clearTimeout(id);
  }, []);

  return start ? <Experience /> : null;
}
