"use client";

import { useState } from "react";
import {
  ENVIRONMENTS,
  INTERIORS,
  PAINTS,
  TRIMS,
  WHEELS,
  type EnvironmentId,
  type InteriorOption,
  type Paint,
  type TrimOption,
  type WheelOption,
} from "@/lib/paints";
import { setSelection } from "@/lib/selection";
import { setToggle, useToggles, type Toggles } from "@/lib/carState";

/*
 * The configurator controls.
 *
 * Each click does two separate things (same as ECLIPSE's finish picker):
 *   1. applyPaint() / applyWheels() / applyTrim() / applyEnvironment() tween the
 *      shared Three.js objects DIRECTLY. The 3D scene is never re-rendered by React.
 *   2. setState updates only this small panel (which button is selected and
 *      the name/description text). That re-render costs almost nothing.
 *      setSelection() shares the choice by name with the Reserve summary.
 *
 * The "Try it" toggles and the Interior tab write to lib/carState.ts; the car
 * eases its doors, lids and lights toward them every frame (Car.tsx).
 *
 * The 3D modules are imported on demand, so Three.js stays out of the page's
 * main JavaScript bundle. By the time anyone clicks, the 3D scene has already
 * loaded them, so the import resolves instantly from cache.
 */

type Tab = "paint" | "wheels" | "interior" | "trim";
const TABS: { id: Tab; label: string }[] = [
  { id: "paint", label: "Paint" },
  { id: "wheels", label: "Wheels" },
  { id: "interior", label: "Interior" },
  { id: "trim", label: "Trim" },
];

const TRY_IT: { key: keyof Toggles; label: string }[] = [
  { key: "lights", label: "Lights" },
  { key: "doors", label: "Doors" },
  { key: "frontLid", label: "Frunk" },
  { key: "rearLid", label: "Trunk" },
];

export default function ConfiguratorPanel() {
  const [env, setEnv] = useState<EnvironmentId>("studio");
  const [chosenTab, setTab] = useState<Tab>("paint");
  const [paintIndex, setPaintIndex] = useState(0);
  const [wheelIndex, setWheelIndex] = useState(0);
  const [trimIndex, setTrimIndex] = useState(0);
  const [interiorIndex, setInteriorIndex] = useState(0);
  const toggles = useToggles();
  // Scrolling away from the configurator resets the toggles (camera back outside),
  // so the Interior tab only counts as open while the camera is still in the cabin.
  const tab: Tab = chosenTab === "interior" && !toggles.cabin ? "paint" : chosenTab;

  const paint = PAINTS[paintIndex];
  const envOption = ENVIRONMENTS.find((e) => e.id === env)!;

  const chooseEnv = async (id: EnvironmentId) => {
    setEnv(id);
    setSelection({ environment: ENVIRONMENTS.find((e) => e.id === id)!.name });
    const { applyEnvironment } = await import("@/components/three/environments");
    applyEnvironment(id);
  };
  const choosePaint = async (p: Paint, i: number) => {
    setPaintIndex(i);
    setSelection({ paint: p.name });
    const { applyPaint } = await import("@/lib/carMaterials");
    applyPaint(p);
  };
  const chooseWheels = async (w: WheelOption, i: number) => {
    if (i === wheelIndex) return;
    setWheelIndex(i);
    setSelection({ wheels: w.name });
    const [{ applyWheels }, { rollWheels }] = await Promise.all([import("@/lib/carMaterials"), import("@/components/three/carModel")]);
    applyWheels(w);
    rollWheels(); // a quick spin so the change catches the eye
  };
  const chooseInterior = async (o: InteriorOption, i: number) => {
    setInteriorIndex(i);
    setSelection({ interior: o.name });
    const { applyInterior } = await import("@/lib/carMaterials");
    applyInterior(o);
  };
  // The Interior tab takes the camera inside (doors open) so you see the cabin you're choosing.
  const openTab = (id: Tab) => {
    setTab(id);
    setToggle("cabin", id === "interior");
  };
  const chooseTrim = async (t: TrimOption, i: number) => {
    setTrimIndex(i);
    setSelection({ trim: t.name });
    const { applyTrim } = await import("@/lib/carMaterials");
    applyTrim(t);
  };

  // What the bottom of the panel describes depends on the open tab.
  const selected =
    tab === "paint"
      ? { name: paint.name, tag: paint.finish, desc: paint.desc }
      : tab === "wheels"
        ? { name: WHEELS[wheelIndex].name, tag: "21″ aero", desc: WHEELS[wheelIndex].desc }
        : tab === "interior"
          ? { name: INTERIORS[interiorIndex].name, tag: "Cabin", desc: INTERIORS[interiorIndex].desc }
          : { name: TRIMS[trimIndex].name, tag: "Exterior trim", desc: TRIMS[trimIndex].desc };

  return (
    <div className="glass reveal mt-6 p-5 desktop:mt-8 desktop:p-7">
      {/* ── Environment: the headline feature, so it comes first ── */}
      <div className="label">Environment</div>
      <div className="mt-3 grid grid-cols-3 gap-1 rounded-full border border-line bg-bg/60 p-1" role="radiogroup" aria-label="Environment">
        {ENVIRONMENTS.map((e) => (
          <button
            key={e.id}
            role="radio"
            aria-checked={e.id === env}
            onClick={() => chooseEnv(e.id)}
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-full px-2 py-2.5 text-[13px] font-medium transition-colors ${
              e.id === env ? "bg-ink text-bg" : "text-muted hover:text-ink"
            }`}
          >
            <EnvIcon id={e.id} />
            {e.name}
          </button>
        ))}
      </div>
      <p className="mt-3 hidden min-h-[2.6em] text-[13px] text-muted desktop:block">{envOption.desc}</p>

      {/* ── Try it: switch the lights, open the doors and lids ── */}
      <div className="mt-5 flex items-center gap-2 desktop:mt-4">
        <span className="label mr-1">Try it</span>
        {TRY_IT.map(({ key, label }) => {
          const on = toggles[key];
          return (
            <button
              key={key}
              aria-pressed={on}
              onClick={() => setToggle(key, !on)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                on ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tabs: Paint / Wheels / Trim ── */}
      <div className="mt-6 flex gap-6 border-b border-line desktop:mt-5" role="tablist" aria-label="Configure">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={t.id === tab}
            aria-controls="config-options"
            onClick={() => openTab(t.id)}
            className={`-mb-px cursor-pointer border-b-2 pb-2.5 text-[12px] uppercase tracking-[0.18em] transition-colors ${
              t.id === tab ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="config-options" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-4">
        {tab === "paint" && (
          // Mobile: a 7-column grid, so all swatches share one row at any phone width
          <div className="grid grid-cols-7 gap-2 desktop:flex desktop:flex-wrap desktop:gap-3" role="radiogroup" aria-label="Paint">
            {PAINTS.map((p, i) => (
              <Swatch
                key={p.name}
                label={`${p.name}, ${p.finish}`}
                active={i === paintIndex}
                onClick={() => choosePaint(p, i)}
                style={{
                  background: `linear-gradient(145deg, ${p.swatch[0]}, ${p.swatch[1]})`,
                  // Matte swatches get no shine; gloss/metallic/pearl get a highlight.
                  boxShadow: p.finish === "Matte" ? "none" : "inset 0 6px 8px -4px rgb(255 255 255 / 0.55)",
                }}
              />
            ))}
          </div>
        )}

        {tab === "wheels" && (
          <div className="grid grid-cols-7 gap-2 desktop:flex desktop:gap-3" role="radiogroup" aria-label="Wheels">
            {WHEELS.map((w, i) => (
              <Swatch
                key={w.name}
                label={w.name}
                active={i === wheelIndex}
                onClick={() => chooseWheels(w, i)}
                // A tiny wheel: rim-colored disc with a dark hub, and a caliper-colored dot.
                style={{
                  background: `radial-gradient(circle at 70% 50%, ${w.caliper} 0 9%, transparent 10%),
                    radial-gradient(circle, #0b0c0e 0 18%, ${w.rim.color === "#ffffff" ? "#dfe3ea" : w.rim.color} 20% 100%)`,
                  boxShadow: "inset 0 0 0 3px #0b0c0e",
                }}
              />
            ))}
          </div>
        )}

        {tab === "interior" && (
          <div className="grid grid-cols-7 gap-2 desktop:flex desktop:gap-3" role="radiogroup" aria-label="Interior">
            {INTERIORS.map((o, i) => (
              <Swatch
                key={o.name}
                label={o.name}
                active={i === interiorIndex}
                onClick={() => chooseInterior(o, i)}
                style={{ background: `radial-gradient(circle at 35% 30%, ${o.color}, ${o.color} 45%, #0b0c0e 120%)` }}
              />
            ))}
          </div>
        )}

        {tab === "trim" && (
          <div className="grid grid-cols-7 gap-2 desktop:flex desktop:gap-3" role="radiogroup" aria-label="Trim">
            {TRIMS.map((t, i) => {
              // Split swatch: window surround on the top-left, roof/sills on the bottom-right.
              const contrast = t.contrast === "body" ? paint.swatch[0] : t.contrast.color;
              return (
                <Swatch
                  key={t.name}
                  label={t.name}
                  active={i === trimIndex}
                  onClick={() => chooseTrim(t, i)}
                  style={{ background: `linear-gradient(135deg, ${t.surround.color} 0 50%, ${contrast} 50% 100%)` }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <span className="text-[20px] font-semibold tracking-tight">{selected.name}</span>
        <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] text-muted">
          {selected.tag}
        </span>
      </div>
      <p className="mt-1 min-h-[2.6em] text-[13px] text-muted">{selected.desc}</p>
    </div>
  );
}

/** One round option button. */
function Swatch({ label, active, onClick, style }: { label: string; active: boolean; onClick: () => void; style: React.CSSProperties }) {
  return (
    <button
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`aspect-square w-full cursor-pointer rounded-full border-2 transition-transform hover:scale-110 desktop:size-[42px] ${
        active ? "border-ink" : "border-transparent"
      }`}
      style={style}
    />
  );
}

/** Small line icons: a softbox (studio), a moon (night), a sun (outdoor). */
function EnvIcon({ id }: { id: EnvironmentId }) {
  const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, "aria-hidden": true };
  if (id === "studio")
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="11" rx="1.5" />
        <path d="M12 14v7M8 21h8" />
      </svg>
    );
  if (id === "night")
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
