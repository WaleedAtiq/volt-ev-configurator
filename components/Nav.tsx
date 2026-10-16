"use client";

import { useState } from "react";

const LINKS = [
  { href: "#design", label: "Design" },
  { href: "#inside", label: "Interior" },
  { href: "#cargo", label: "Storage" },
  { href: "#performance", label: "Performance" },
  { href: "#reserve", label: "Reserve" },
];

// Fixed, blurred top bar (same structure as ECLIPSE): links on desktop, a menu on mobile.
export default function Nav() {
  const [open, setOpen] = useState(false); // mobile menu

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 border-b border-line backdrop-blur-md transition-colors ${open ? "bg-bg/90" : "bg-bg/55"}`}>
      <div className="flex items-center justify-between px-[22px] py-[16px] desktop:px-8">
        <a href="#hero" className="font-display text-[16px] font-bold tracking-[0.35em]">
          V<span className="text-accent">O</span>LT
        </a>

        <ul className="hidden gap-7 desktop:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-[13px] tracking-[0.08em] text-muted transition-colors hover:text-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <a href="#configure" className="btn-outline" onClick={() => setOpen(false)}>
            Configure yours
          </a>
          <button
            className="text-[22px] desktop:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu: links close it when tapped */}
      {open && (
        <ul className="flex flex-col gap-1 border-t border-line px-[22px] pb-6 pt-3 desktop:hidden">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} className="block py-3 text-lg text-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
