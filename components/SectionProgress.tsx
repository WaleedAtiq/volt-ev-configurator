"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTIONS } from "@/lib/poses";

// Same section list as the nav and lib/poses.ts, so they can never drift apart.
const SECTION_IDS = SECTIONS.map((s) => s.id);

/*
 * Section scroll progress indicator.
 *   Desktop: a small chapter indicator in the bottom-right corner: the current
 *            chapter's number + name, a thin progress line, and a ↓ button that
 *            glides to the next chapter (Lenis smooth-scrolls #anchor links).
 *            On the hero it reads "Scroll to explore", which doubles as the
 *            scroll cue.
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
const last = SECTION_IDS.length - 1;

export default function SectionProgress() {
  const [active, setActive] = useState(0);
  const lineFill = useRef<HTMLDivElement>(null);
  const topBar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const setFill = (value: number) => {
      const v = Math.min(1, Math.max(0, value));
      if (lineFill.current) lineFill.current.style.transform = `scaleX(${v})`;
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

    // The fill is measured in sections, not pixels, so each section gets an
    // equal share of the line, however tall it is.
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

      {/* Desktop: chapter indicator, bottom-right */}
      <nav aria-label="Page progress" className="fixed bottom-6 right-7 z-40 hidden items-center gap-4 desktop:flex">
        <div className="text-right">
          {/* key={active}: React re-creates this line when the chapter changes, which replays the fade-in */}
          <div key={active} className="fade-up text-[11px] uppercase tracking-[0.22em]">
            {active === 0 ? (
              <span className="text-muted">Scroll to explore</span>
            ) : (
              <>
                <span className="text-accent">{String(active).padStart(2, "0")}</span>
                <span className="text-muted"> / {String(last).padStart(2, "0")}</span>
                <span className="ml-2 text-ink">{SECTIONS[active].label}</span>
              </>
            )}
          </div>
          {/* Whole-page progress line */}
          <div className="ml-auto mt-2 h-px w-36 bg-white/15" aria-hidden="true">
            <div ref={lineFill} className="h-full origin-left bg-accent [transform:scaleX(0)]" />
          </div>
        </div>
        {/* Next chapter (hidden on the last one) */}
        {active < last && (
          <a
            href={`#${SECTIONS[active + 1].id}`}
            aria-label={`Next: ${SECTIONS[active + 1].label}`}
            className="grid size-10 place-items-center rounded-full border border-line bg-bg/60 text-ink backdrop-blur transition-colors hover:border-accent hover:text-accent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </a>
        )}
      </nav>
    </>
  );
}
