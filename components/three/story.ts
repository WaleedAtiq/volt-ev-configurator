import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { story } from "@/lib/carState";

/*
 * ─── THE SCROLL STORY ──────────────────────────────────────────────────────────
 *
 * Each block below is one scene. A "scrubbed" GSAP timeline ties the values in
 * `story` (lib/carState.ts) to the scroll position: scrolling down plays the
 * scene forward, scrolling up plays it backwards. Car.tsx then eases the real
 * doors, lids and lights toward these values every frame.
 *
 * Inside a timeline, `duration` is a share of the scene's scroll distance
 * (they add up to 1), and `.to({}, { duration })` is a pause: hold the pose
 * while the visitor reads.
 *
 * The camera moves separately (lib/poses.ts + CameraRig.tsx); these scenes are
 * timed to the same page sections so both line up.
 */
export function createStory() {
  gsap.registerPlugin(ScrollTrigger);

  const ctx = gsap.context(() => {
    // 1. LIGHT SIGNATURE: the showroom goes dark with the headlights, then the
    //    headlights flicker on and the room light comes back up behind them.
    gsap
      .timeline({ scrollTrigger: { trigger: "#design-front", start: "top 75%", end: "bottom 25%", scrub: true } })
      .to(story, { headlights: 0, ambient: 0.2, duration: 0.15 })
      .to({}, { duration: 0.12 })
      .to(story, { headlights: 1, duration: 0.02 })
      .to(story, { headlights: 0.1, duration: 0.02 })
      .to(story, { headlights: 1, duration: 0.04 })
      .to({}, { duration: 0.15 })
      .to(story, { ambient: 1, duration: 0.3 })
      .to({}, { duration: 0.2 });

    // 2. DOORS: open while the camera walks up to the side, stay open while it
    //    goes into the cabin, close as it leaves. (Spans two sections.)
    gsap
      .timeline({
        scrollTrigger: { trigger: "#doors", endTrigger: "#interior", start: "top 70%", end: "bottom 60%", scrub: true },
      })
      .to(story, { doors: 1, duration: 0.2, ease: "power2.inOut" })
      .to({}, { duration: 0.65 })
      .to(story, { doors: 0, duration: 0.15, ease: "power2.inOut" });

    // 3. CABIN: the driver's display wakes up while the camera is inside.
    gsap
      .timeline({ scrollTrigger: { trigger: "#interior", start: "top 80%", end: "bottom 40%", scrub: true } })
      .to(story, { screen: 1, duration: 0.15 })
      .to({}, { duration: 0.7 })
      .to(story, { screen: 0, duration: 0.15 });

    // 4. FRUNK: the front clamshell lifts, holds, and closes.
    gsap
      .timeline({ scrollTrigger: { trigger: "#frunk", start: "top 70%", end: "bottom 30%", scrub: true } })
      .to(story, { frontLid: 1, duration: 0.3, ease: "power2.inOut" })
      .to({}, { duration: 0.4 })
      .to(story, { frontLid: 0, duration: 0.3, ease: "power2.inOut" });

    // 5. TRUNK: two brake-light flashes, then the rear clamshell opens and closes.
    gsap
      .timeline({ scrollTrigger: { trigger: "#trunk", start: "top 75%", end: "bottom 25%", scrub: true } })
      .to(story, { brake: 1, duration: 0.04 })
      .to(story, { brake: 0, duration: 0.04 })
      .to(story, { brake: 1, duration: 0.04 })
      .to(story, { brake: 0, duration: 0.04 })
      .to(story, { rearLid: 1, duration: 0.3, ease: "power2.inOut" })
      .to({}, { duration: 0.3 })
      .to(story, { rearLid: 0, duration: 0.24, ease: "power2.inOut" });
  });

  return () => ctx.revert(); // kill every timeline + ScrollTrigger (on unmount)
}
