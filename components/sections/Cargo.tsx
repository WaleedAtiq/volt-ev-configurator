import Chapter from "./Chapter";

/*
 * Storage: the rear clamshell opens after two brake-light flashes ("trunk"),
 * then the camera swings round to the front as the front clamshell lifts ("frunk").
 * See the "trunk" / "frunk" camera stops in lib/poses.ts and story.ts.
 */
export default function Cargo() {
  return (
    <section id="cargo" aria-label="Storage">
      <Chapter
        id="trunk"
        eyebrow="03 — Storage / 01 Rear"
        title="Leaves a signature."
        text="A single light bar spans the tail. Behind it, the whole rear clamshell lifts away for a low, wide load floor."
        chips={["Edge-to-edge light bar", "400 L rear trunk"]}
        side="right"
      />
      <Chapter
        id="frunk"
        eyebrow="03 — Storage / 02 Front"
        title="Room where the engine was."
        text="No engine up front means a second trunk. The front clamshell rises to reveal a weatherproof frunk for the bags you need first."
        chips={["90 L frunk", "Power-operated lids"]}
      />
    </section>
  );
}
