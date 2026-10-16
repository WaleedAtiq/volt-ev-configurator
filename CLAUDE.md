# CLAUDE.md — Project Context for Claude Code

## What this project is
**VOLT** is an immersive landing page + **3D car configurator** for a fictional electric vehicle.
It is a **portfolio piece** for Waleed Atiq (front-end developer) to showcase on Upwork — the
flagship "wow" centerpiece aimed at automotive and premium product brands. A real-time 3D car that
the visitor can rotate, repaint, re-trim, and view in different environments (studio / night / outdoor).

**Important:** Concept build, not a real product. Footer credits "Designed & developed by Waleed Atiq."

## Where this fits (don't over-build)
Waleed already has two finished pieces: ECLIPSE (3D watch) and PULSE (SaaS site). VOLT is a third,
flagship piece. **After VOLT, the priority is deploying all three and sending proposals — not building
more.** Three strong, varied pieces is a complete portfolio.

## Owner's skill level & how to help (read first)
- The owner is **newer to development** and will present this to clients, so he must **understand,
  explain, and maintain** everything here. Favor clear, commented code; explain *why* as you build.
- Don't introduce a tool/pattern without a one-line explanation. Teach as you go.

## Tech stack (reuse the ECLIPSE patterns — they're proven)
- **Next.js (App Router) + TypeScript + Tailwind v4 + React Three Fiber + GSAP ScrollTrigger + Lenis.**
- Reuse ECLIPSE's architecture wholesale where possible:
  - Fixed full-screen `<Canvas>` loaded client-only (`next/dynamic`, `ssr:false`) with a WebGL/perf probe.
  - **Shared materials created once outside React**; configurator tweens them with GSAP (zero React
    re-renders of the 3D scene) — same pattern as `lib/watchMaterials.ts` / `applyFinish()`.
  - Pose-per-section scroll choreography with `useFrame` damping toward a target.
  - Smooth scroll (Lenis ↔ GSAP ticker), `.reveal` + `[data-count]` scroll effects, section progress.
  - Adaptive quality (drop dpr on low fps), reduced-motion path, static poster fallback for no-GPU devices.

## The car model — pick a path (this is the key decision)
A car is much harder to build procedurally than the watch. Two options; **recommend the .glb path**:

**Path A — real .glb model (recommended for realism):**
- Source a free, licensed car model (Sketchfab CC, Poly Pizza, Quaternius). **Check the license** and
  keep it generic/fictional — don't use a real brand's logo or trademarked design.
- **Compress before use** (this is where multi-MB → few-MB wins come from):
  ```bash
  npx @gltf-transform/cli optimize car.glb public/models/car.glb --compress meshopt --texture-compress webp --texture-size 2048
  ```
- Load with `useGLTF` (`@react-three/drei` is OK here). Assign the **shared paint material** to the body
  mesh(es) by name so the configurator keeps working. Separate meshes for body / wheels / glass / trim.

**Path B — stylized procedural car (no download, pure code):**
- A clean, lower-poly stylized car built from extruded profiles + boxes. Less photoreal but on-brand,
  zero asset weight, and fully yours. Good if a well-licensed model can't be found.

## Configurator features (the selling points)
1. **Paint selector** — swatches that tween the body material's color (and clear-coat for metallic/matte).
   Include matte vs gloss (roughness + clearcoat differences), not just hue.
2. **Trim / wheels selector** — swap wheel style and accent trim (brightwork vs blacked-out).
3. **Environment switch — the star feature** — Studio / Night / Outdoor. Each changes:
   - the **environment map** (reflections) — build these in code like `studioEnvironment.ts`
     (softboxes for studio; warm dusk gradient for outdoor; dark with neon rim lights for night),
   - the **background + ground**, and the **key/fill lighting** and tone/exposure.
   - Transition smoothly (crossfade exposure / lerp light intensities), don't hard-cut.
4. **Drag to rotate** the car (reuse the ECLIPSE drag-to-rotate shared-state pattern) + a slow auto-spin idle.
5. Optional: headlights on/off in Night mode (emissive + a soft light).

## Page sections (in order)
1. **Nav** — fixed, blur, CTA "Configure yours".
2. **Hero** — the car center stage, bold EV headline, range/0-60/power stats, scroll cue.
3. **Design / exterior** — scroll poses that orbit the car (front → side → rear).
4. **Configurator** — paint + wheels + environment switch (the interactive core).
5. **Performance** — count-up spec band (range, 0–60, horsepower, charge time).
6. **Interior / tech** — a feature list (can reuse a simple layout; interior 3D optional/stretch).
7. **Reserve / CTA** — gradient band, demo reserve button.
8. **Footer** — links + Waleed Atiq credit.

## Suggested structure (mirror ECLIPSE)
```
app/            layout.tsx, page.tsx, globals.css (@theme tokens)
components/
  three/  SceneLoader, Experience, Car (assembles model), carGeometry OR model loader,
          environments.ts (studio/night/outdoor env maps + lighting presets)
  sections/  Hero, Design, Configurator, Performance, Interior, Reserve, Footer
  SmoothScroll, ScrollEffects, SectionProgress, Nav, DragToRotate
lib/
  poses.ts        orbit poses per section (desktop + mobile)
  carMaterials.ts shared paint/trim/glass materials + applyPaint()/applyTrim()
  paints.ts       paint + wheel + environment option data
```

## Build order for this session
1. Scaffold Next.js (`npx create-next-app@latest . --ts --tailwind --app --eslint`).
2. Decide the model path (A .glb or B procedural) and get the car rendering in a fixed Canvas.
3. Shared materials + paint selector (simplest configurator win first).
4. Environment switch (studio/night/outdoor) — the headline feature.
5. Wheels/trim selector, drag-to-rotate.
6. Scroll poses orbiting the car + the page sections.
7. Reveals/counters, responsive pass, `npm run build`, Lighthouse check.

## Guardrails
- **No real car brands, logos, or trademarked designs.** Keep it a fictional EV.
- Verify the license of any downloaded model; keep a note of the source + license in the README.
- Don't claim the product is real. No analytics/tracking/external calls beyond the model file.
- Keep performance high (judged on mobile) — compress the model, cap dpr, provide the no-GPU fallback.
- Explain changes so the owner can defend the code in a client call.
