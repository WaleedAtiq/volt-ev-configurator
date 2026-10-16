"use client";

import { useLoadState } from "@/lib/loadProgress";

/*
 * Small pill at the bottom of the screen while the 2.5 MB car model downloads.
 * The page text is fully usable meanwhile; this just tells the visitor that
 * something is on its way, then fades out once the first frame is drawn.
 * (Hidden on devices that get the static fallback: see .no-3d in globals.css.)
 */
export default function LoadingBadge() {
  const { progress, ready } = useLoadState();

  return (
    <div
      className={`loading-badge pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-line bg-bg/70 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted backdrop-blur transition-opacity duration-700 ${
        ready ? "opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span>{progress >= 1 ? "Preparing paint" : "Loading VOLT ONE"}</span>
        <span className="relative block h-[2px] w-16 overflow-hidden rounded bg-white/10">
          <span className="absolute inset-0 origin-left bg-accent transition-transform duration-300" style={{ transform: `scaleX(${progress})` }} />
        </span>
        <span className="w-8 text-right tabular-nums text-ink">{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
}
