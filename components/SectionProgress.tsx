"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTIONS } from "@/lib/poses";

// Same section list as the nav and lib/poses.ts, so they can never drift apart.
const SECTION_IDS = SECTIONS.map((s) => s.id);

/*
 * Section scroll progress indicator.
 *   Desktop: a vertical rail on the right, with one dot per section. The line
 *            fills as you scroll, and clicking a dot glides to that section
 *            (Lenis handles the smooth scroll for #anchor links).
 *   Mobile:  a thin gradient bar along the top edge.
 *
 * Performance follows the same rule as the 3D car: things that change every
 * scroll frame (the fill amount) are written straight to the DOM through refs,
 * never through React state. Only the *active section* uses state, and that
 * changes about 6 times per full page scroll, so the re-render cost is negligible.
 *
 * Gotcha: the fills start at [transform:scaleX(0)], not Tailwind's `scale-x-0`.
 * In Tailwind v4, `scale-x-0` uses the separate CSS `scale` property, which
 * would multiply with the transform we set from JS and keep the bar at 0 forever.
 */
export default function SectionProgress() {
  const [active, setActive] = useState(0);
  const railFill = useRef<HTMLDivElement>(null);
  const topBar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const last = SECTION_IDS.length - 1;

    const setFill = (value: number) => {
      const v = Math.min(1, Math.max(0, value));
      if (railFill.current) railFill.current.style.transform = `scaleY(${v})`;
      if (topBar.current) topBar.current.style.transform = `scaleX(${v})`;
    };

    // One trigger per section, "active" while the section covers the middle of the screen.
    const sections = SECTION_IDS.map((id, i) =>
      ScrollTrigger.create({
        trigger: `#${id}`,
        // The hero starts at the very top of the page, so the line is empty on load.
        start: i === 0 ? "top top" : "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (self.isActive) setActive(i);
        },
      })
    );

    // The fill is measured in sections, not pixels, so the line reaches each
    // dot exactly when its section arrives (sections have different heights).
    // Each section's progress runs 0 → 1, one after another, so their SUM is
    // always "current section index + progress through it". We calculate each
    // one from the scroll position and the section's start/end pixel values
    // (rather than reading t.progress) so the result never depends on the order
    // in which ScrollTrigger happens to update its triggers.
    const updateFill = (self: ScrollTrigger) => {
      const y = self.scroll();
      const passed = sections.reduce((sum, t) => sum + gsap.utils.clamp(0, 1, (y - t.start) / (t.end - t.start)), 0);
      setFill(passed / last);
    };
    const page = ScrollTrigger.create({ start: 0, end: "max", onUpdate: updateFill, onRefresh: updateFill });

    return () => [...sections, page].forEach((t) => t.kill());
  }, []);

  return (
    <>
      {/* Mobile: thin bar along the top edge */}
      <div className="fixed inset-x-0 top-0 z-[60] h-[2px] desktop:hidden" aria-hidden="true">
        <div ref={topBar} className="h-full origin-left bg-gradient-to-r from-accent to-accent-2 [transform:scaleX(0)]" />
      </div>

      {/* Desktop: vertical rail on the right */}
      <nav aria-label="Page sections" className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 desktop:block">
        <div className="relative flex flex-col gap-7">
          {/* Track + fill, running through the centers of the dots */}
          <div className="absolute bottom-2 right-[4px] top-2 w-px bg-white/10" aria-hidden="true">
            <div ref={railFill} className="h-full w-full origin-top bg-accent [transform:scaleY(0)]" />
          </div>

          {SECTION_IDS.map((id, i) => {
            const isActive = i === active;
            return (
              <a
                key={id}
                href={`#${id}`}
                aria-label={SECTIONS[i].label}
                aria-current={isActive ? "true" : undefined}
                className="group relative flex items-center justify-end gap-3"
              >
                {/* Label: shown on hover/focus; the active one stays visible on wide screens */}
                <span
                  className={`whitespace-nowrap text-[11px] uppercase tracking-[0.2em] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 ${
                    isActive ? "text-ink min-[1360px]:opacity-100" : "text-muted"
                  }`}
                >
                  {/* Numbered from 00 so they match the section eyebrows ("01 — Design"…) */}
                  <span className="text-accent">{String(i).padStart(2, "0")}</span> {SECTIONS[i].label}
                </span>
                {/* Dot: filled once reached, enlarged + glowing when active */}
                <span
                  className={`relative z-10 block size-[9px] rounded-full border transition-all duration-300 ${
                    i <= active ? "border-accent bg-accent" : "border-white/30 bg-bg"
                  } ${isActive ? "scale-150 shadow-[0_0_12px_var(--color-accent)]" : "group-hover:border-white/70"}`}
                />
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
