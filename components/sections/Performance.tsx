const STATS = [
  { value: 410, decimals: 0, unit: "mi", label: "Range (est.)" },
  { value: 2.9, decimals: 1, unit: "s", label: "0–60 mph" },
  { value: 760, decimals: 0, unit: "hp", label: "Dual-motor output" },
  { value: 18, decimals: 0, unit: "min", label: "10–80% fast charge" },
];

// The camera drops low for a dramatic shot of the car above the spec band.
// Numbers render as their real value in HTML (good for SEO / no-JS), then
// ScrollEffects counts them up from 0 when they scroll into view.
export default function Performance() {
  return (
    <section id="performance" className="section desktop:items-end">
      <div className="w-full">
        <div className="reveal desktop:max-w-[520px]">
          <div className="eyebrow">05 — Performance</div>
          <h2 className="heading">Silence, at full speed.</h2>
          <p className="lead">
            Two motors, one on each axle, deliver all 760 hp the instant you ask, then fall quiet enough to hear the
            tires on the road.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 desktop:mt-10 desktop:grid-cols-4 desktop:gap-5">
          {STATS.map((s) => (
            <div key={s.label} className="glass reveal p-5 desktop:p-7">
              <div className="font-display text-[28px] font-bold desktop:text-[40px]">
                <span data-count={s.value} data-decimals={s.decimals}>
                  {s.value.toFixed(s.decimals)}
                </span>
                <small className="ml-1 text-base text-accent">{s.unit}</small>
              </div>
              <div className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
