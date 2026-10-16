import Chapter from "./Chapter";

/*
 * Design: two chapters, one screen each (camera stops "design-*" in lib/poses.ts).
 * In the first, the headlights go dark and flicker back on (components/three/story.ts).
 */
export default function Design() {
  return (
    <section id="design" aria-label="Design">
      <Chapter
        id="design-front"
        eyebrow="01 — Design / 01 Light signature"
        title="Wakes up in light."
        text="One continuous surface from nose to tail, and a full-width light blade instead of a grille, because an electric car has nothing to cool up front. Scroll and watch it switch on."
        chips={["Full-width LED blade", "0.21 drag coefficient"]}
      />
      <Chapter
        id="design-side"
        eyebrow="01 — Design / 02 Profile"
        title="A roof that floats."
        text="Blacked-out pillars make the roof hover above the body, and 21-inch aero wheels close the gaps air hates."
        chips={["Floating roof", "21″ aero wheels"]}
      />
    </section>
  );
}
