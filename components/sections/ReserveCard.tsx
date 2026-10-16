"use client";

import { useState } from "react";
import { useSelection } from "@/lib/selection";

/*
 * Reserve card. It reads the visitor's choices from the configurator
 * (lib/selection.ts), so the summary shows the car they actually built.
 *
 * Demo only: this is a concept build, so nothing is ordered or sent anywhere.
 */
export default function ReserveCard() {
  const { paint, wheels, interior, trim } = useSelection();
  const [reserved, setReserved] = useState(false);

  return (
    <div className="reveal relative w-full overflow-hidden rounded-[26px] border border-line p-[1px] desktop:w-[46%]">
      {/* Gradient border + soft glow: a gradient layer behind a slightly smaller dark card */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/70 via-accent-2/40 to-transparent" aria-hidden="true" />
      <div className="relative rounded-[25px] bg-bg/85 px-6 py-10 backdrop-blur-xl desktop:px-10 desktop:py-12">
        <div className="eyebrow">06 — Reserve · Launch edition</div>
        <h2 className="heading">Be first on the road.</h2>
        <p className="lead">
          Reservations are open for the 2027 launch edition. Fully refundable, and you can change your spec until
          production.
        </p>

        <div className="mt-7 rounded-2xl border border-line bg-white/[0.03] p-5">
          <div className="label">Your VOLT ONE</div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px] desktop:grid-cols-4">
            {[
              ["Paint", paint],
              ["Wheels", wheels],
              ["Interior", interior],
              ["Trim", trim],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted">{k}</dt>
                <dd className="mt-0.5 font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <a href="#configure" className="mt-4 inline-block text-[12px] text-accent hover:underline">
            Change configuration ↑
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button className="btn cursor-pointer disabled:cursor-default" onClick={() => setReserved(true)} disabled={reserved}>
            {reserved ? "Reserved ✓ (concept demo)" : "Reserve for $1,000 →"}
          </button>
          <span className="text-[13px] text-muted">
            From <b className="text-ink">$89,900</b> · deliveries 2027
          </span>
        </div>
      </div>
    </div>
  );
}
