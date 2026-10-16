export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-line bg-bg/80 px-[22px] py-10 text-[13px] text-muted backdrop-blur desktop:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 desktop:flex-row desktop:items-end desktop:justify-between">
        <div>
          <div className="font-display text-[15px] font-bold tracking-[0.35em] text-ink">
            V<span className="text-accent">O</span>LT
          </div>
          <nav aria-label="Footer" className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {[
              ["#design", "Design"],
              ["#inside", "Interior"],
              ["#cargo", "Storage"],
              ["#configure", "Configure"],
              ["#performance", "Performance"],
              ["#reserve", "Reserve"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <p className="mt-4">Concept build. VOLT is a fictional vehicle, not a real product.</p>
          <p className="mt-1">
            Designed &amp; developed by <span className="text-ink">Waleed Atiq</span>.
          </p>
        </div>
        {/* Required by the model's CC BY 4.0 license: credit + link + "changes were made". */}
        <p className="max-w-[460px] text-[12px] leading-relaxed desktop:text-right">
          3D model: &ldquo;Car Concept&rdquo; by Eric Chadwick, &copy; 2024 Darmstadt Graphics Group GmbH,{" "}
          <a className="underline hover:text-ink" href="https://creativecommons.org/licenses/by/4.0/" rel="noopener noreferrer" target="_blank">
            CC BY 4.0
          </a>
          . Modified: logos removed, dashboard redrawn, materials replaced, compressed.
        </p>
      </div>
    </footer>
  );
}
