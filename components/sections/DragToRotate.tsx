"use client";

import { useRef, useState } from "react";
import { carSpin } from "@/lib/carInteraction";

const RADIANS_PER_PIXEL = 0.008; // drag ~400px ≈ half a turn

/*
 * An invisible area over the car that turns horizontal drags into spin
 * (same as ECLIPSE's DragToRotate).
 *
 * - Pointer events cover mouse, touch and pen in one API.
 * - setPointerCapture keeps the drag going even if the pointer leaves the area.
 * - `touch-action: pan-y` lets phones still scroll the page vertically, while
 *   sideways swipes rotate the car.
 */
export default function DragToRotate({ className = "" }: { className?: string }) {
  const last = useRef({ x: 0, t: 0 });
  const [used, setUsed] = useState(false); // hide the hint after the first drag

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    carSpin.dragging = true;
    carSpin.velocity = 0;
    last.current = { x: e.clientX, t: e.timeStamp };
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!carSpin.dragging) return;
    const dx = e.clientX - last.current.x;
    const dt = Math.max(1, e.timeStamp - last.current.t) / 1000; // seconds
    const turn = dx * RADIANS_PER_PIXEL;
    carSpin.offset += turn;
    // Smoothed speed, used for the "flick" when you let go.
    carSpin.velocity = carSpin.velocity * 0.6 + (turn / dt) * 0.4;
    last.current = { x: e.clientX, t: e.timeStamp };
  };

  const onUp = () => {
    if (!carSpin.dragging) return;
    carSpin.dragging = false;
    carSpin.idle = 0;
    if (!used) setUsed(true);
  };

  return (
    <div
      className={`cursor-grab touch-pan-y select-none active:cursor-grabbing ${className}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-hidden="true"
    >
      <div
        className={`pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-bg/70 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted backdrop-blur transition-opacity duration-500 desktop:bottom-[14%] ${
          used ? "opacity-0" : "opacity-100"
        }`}
      >
        ⟲ Drag to rotate
      </div>
    </div>
  );
}
