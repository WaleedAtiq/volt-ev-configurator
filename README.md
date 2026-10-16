# VOLT — 3D EV Car Configurator

An immersive landing page + real-time **3D car configurator** **concept** for a fictional electric
vehicle, the VOLT ONE. Change the paint (gloss / metallic / matte / pearl) and switch the whole scene
between **studio / night / outdoor**, each with its own reflections, lighting, sky and floor.

**Built by Waleed Atiq.** Concept build to showcase front-end development. VOLT is not a real product.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Three.js via React Three Fiber · GSAP ScrollTrigger · Lenis

## Run locally
```bash
npm install
npm run dev
```
Other scripts: `npm run build` (production build), `npm run typecheck`, `npm run lint`.

## Deploy (Vercel)
Live at **https://volt-ev-configurator.vercel.app**. The code is in the private GitHub repo
`WaleedAtiq/volt-ev-configurator`, and the Vercel project is connected to it: **every push to `main`
redeploys the site automatically** (other branches get their own preview link).
```bash
git add -A && git commit -m "Describe the change" && git push
```

## How it works (the 60-second version for a client call)
- **One fixed 3D canvas behind the page.** The HTML sections scroll over it; the *camera* orbits the
  car per section (`lib/poses.ts`, `components/three/CameraRig.tsx`).
- **Instant configurator.** Materials are created once outside React (`lib/carMaterials.ts`). Clicking
  a swatch tweens the material with GSAP. React never re-renders the 3D scene, so it never lags.
- **Environments are built in code, not downloaded** (`components/three/environments.ts`). Each one is
  a tiny invisible scene (softboxes / neon tubes / dusk sky + sun) photographed into a reflection map.
  0 KB of HDR images. Switching blends sky, floor, lights, exposure and headlights over ~1 s.
- **Glow:** a bloom pass (Three.js's own `UnrealBloomPass`) makes only the brightest pixels glow: lights,
  the dashboard screen, chrome glints. It is the first thing dropped on slow devices.
- **Performance:** compressed 2.6 MB model, capped pixel ratio, auto-lower quality under 45 fps (lower pixel ratio + no glow), shaders
  compiled in the background before the first frame, Three.js kept out of the main JS bundle, static
  fallback for devices without graphics acceleration.

## File map
```
app/                    layout (fonts, metadata), page (section order), globals.css (theme tokens)
components/three/
  SceneLoader.tsx       GPU check + starts the 3D when the browser is idle
  Experience.tsx        the <Canvas>, world, adaptive quality, shader warm-up
  Effects.tsx           glow ("bloom") on lights + screen; switched off on slow devices
  CameraRig.tsx         scroll-driven camera orbit with damping
  carModel.ts           loads the .glb, swaps in shared materials, contact shadow, rollWheels()
  Car.tsx               turntable, doors/lids/lights easing every frame, shadow, headlight beam
  story.ts              the scroll story: scrubbed timelines for doors, lids, lights, display
  environments.ts       studio / night / outdoor presets + applyEnvironment()
components/sections/    Hero, Design, Inside (doors + cabin), Cargo (trunk + frunk) — all built from Chapter,
                        Configurator (+ ConfiguratorPanel, DragToRotate), Performance, Reserve (+ ReserveCard), Footer
components/             Nav, SectionProgress (rail), SmoothScroll, ScrollEffects (reveals + count-ups), LoadingBadge
lib/
  paints.ts             paint, wheel, trim, interior + environment option data (what the UI lists)
  carMaterials.ts       shared materials + applyPaint() / applyWheels() / applyTrim() / applyInterior()
  carInteraction.ts     drag-to-rotate state shared between the HTML drag area and the 3D
  poses.ts              camera stops (desktop + mobile) + the section list for nav/rail
  selection.ts          current choices by name (configurator → Reserve summary)
  carState.ts           what the car is doing: story values + configurator toggles
  loadProgress.ts       tiny store for the loading badge
scripts/prepare-model.py  removes logos, redraws the dashboard, names the model's parts (see below)
```

## 3D model: source, license, changes
- **Model:** "Car Concept" from the [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept)
  (raw file kept in `models-src/`, git-ignored).
- **Credit:** Model and textures by Eric Chadwick. © 2024 Darmstadt Graphics Group GmbH.
- **License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (credit required; credited in the site footer).
- **Why this model:** it has everything the scroll story needs: a modelled interior, both doors, the front
  and rear clamshells as separate parts whose origins sit exactly on their hinges, and separate head, tail and
  turn-signal lights.
- **Changes made** (CC BY asks you to say so), all by `scripts/prepare-model.py`:
  1. Removed the Khronos and 3D Commerce logos (tire sidewall color + bump textures, plate, glow textures);
     added a "VOLT" plate.
  2. Replaced the petrol-style "fuel / engine RPM" dashboard with a VOLT EV display.
  3. Renamed parts (`Body Paint`, `DoorL`, `FrontLid`…) and gave the window gaskets their own material.
  4. Removed the built-in color variants; replaced paint, glass, trim, wheel, interior and light materials in code.
  5. Compressed 11.8 MB → 2.6 MB (meshopt geometry, WebP textures, max 1024 px).

### Reproducing the model file
```bash
# 1. Unpack the original .glb into editable .gltf + .png files
npx @gltf-transform/cli copy models-src/khronos-car-concept.glb unpacked/car.gltf
# 2. Logos, dashboard, part names (edits the files in unpacked/)
python3 scripts/prepare-model.py unpacked
# 3. Compress. IMPORTANT: join/flatten/palette OFF, or the named parts the configurator needs are merged away
npx @gltf-transform/cli optimize unpacked/car.gltf public/models/volt-one-v4.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 \
  --join false --flatten false --palette false --instance false --simplify false
```
When the model changes, give the file a **new name** and update `CAR_URL` in `components/three/carModel.ts`:
browsers cache `/models/*` for a week, so a new file under an old name keeps showing the old car.

## The scroll story (what happens where)
| Section (id) | Camera | The car |
|---|---|---|
| `design-front` | nose-on | showroom dims, headlights go dark, then flicker on |
| `design-side` | profile | – |
| `doors` | beside the car | scissor doors rise, hazards blink |
| `interior` | flies in through the door to the driver's seat | dashboard display wakes up |
| `trunk` | high rear 3/4 | two brake-light flashes, rear clamshell opens |
| `frunk` | high front 3/4 | front clamshell opens |
| `configure` | – | "Try it" toggles (lights, doors, frunk, trunk); Interior tab takes you inside |

Each story chapter is 1.7 screens tall with its text pinned (`.chapter` in `app/globals.css`), so every
camera move arrives and then holds while you read. Camera stops: `lib/poses.ts`. Car actions: `components/three/story.ts` (scrubbed GSAP timelines writing
`lib/carState.ts`). Hinge angles + every-frame easing: `components/three/Car.tsx`.

## Status
Done: scaffold, model pipeline, car rendering, paint selector (7 paints, 4 finishes), environment switch
(studio / night / outdoor), wheels (4 finish packages, with a wheel-roll on change), trim (Shadowline /
Brightwork / Monochrome / Titanium), interior colors (Cognac / Oxblood / Ivory / Charcoal), drag-to-rotate
turntable with idle auto-spin, the full scroll story (lights, scissor doors, camera into the cabin, live EV
dashboard, trunk + frunk, brake lights, hazards), "Try it" toggles, Performance (count-up specs), Reserve
(summary of your configuration, demo button), section progress rail, responsive layout.

Note on wheels: the model has one rim design, so wheel options are finish packages (rim + caliper color),
not different spoke shapes.

Next: static poster image for no-GPU devices, Lighthouse pass, deploy.
