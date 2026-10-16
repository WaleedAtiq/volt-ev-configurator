const STATS = [
  { value: "410", unit: "mi", label: "Range (est.)" },
  { value: "2.9", unit: "s", label: "0–60 mph" },
  { value: "760", unit: "hp", label: "Dual-motor" },
];

// The car itself is drawn by the 3D canvas behind the page.
// Desktop: it sits in the right half; mobile: above this text.
export default function Hero() {
  return (
    <header id="hero" className="section">
      <div className="w-full text-center desktop:w-[48%] desktop:text-left">
        <div className="eyebrow">VOLT ONE — Concept EV</div>
        <h1 className="font-display text-[clamp(44px,6vw,88px)] font-bold leading-[0.98] tracking-[-0.03em]">
          Pure charge.
          <br />
          <span className="font-light text-muted">Zero compromise.</span>
        </h1>
        <p className="mx-auto mb-9 mt-6 max-w-[440px] text-[17px] text-muted desktop:mx-0">
          A dual-motor electric grand tourer with 410 miles of range, an 18-minute fast charge and a cabin built
          around silence.
        </p>
        <a href="#configure" className="btn">
          Configure yours →
        </a>
        <div className="mt-12 flex flex-wrap justify-center gap-8 desktop:justify-start desktop:gap-12">
          {STATS.map((s) => (
            <div key={s.label}>
              <b className="font-display block text-[28px] font-bold">
                {s.value}
                <span className="ml-0.5 text-[16px] font-medium text-muted">{s.unit}</span>
              </b>
              <span className="text-[11px] uppercase tracking-[0.16em] text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
